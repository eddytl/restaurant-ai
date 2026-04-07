import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import PQueue from 'p-queue';
import pino from 'pino';
import pinoHttp from 'pino-http';
import Redis from 'ioredis';
import promClient from 'prom-client';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
    : undefined
});

// ─── Prometheus metrics ──────────────────────────────────────────────────────
promClient.collectDefaultMetrics({ prefix: 'agent_' });

const httpDuration = new promClient.Histogram({
  name: 'agent_http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});
const activeSessions = new promClient.Gauge({
  name: 'agent_active_sessions',
  help: 'Number of sessions in L1 cache'
});
const claudeTokensTotal = new promClient.Counter({
  name: 'agent_claude_tokens_total',
  help: 'Total Claude tokens used',
  labelNames: ['direction']
});
const queueSize = new promClient.Gauge({
  name: 'agent_queue_size',
  help: 'Pending tasks in Claude queue'
});

// Redis — optional L2 session cache. Falls back to DB-only if not configured.
const SESSION_TTL = 86400; // 24h
let redis = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  redis.on('error', (err) => logger.warn({ err: err.message }, 'Redis error'));
  redis.connect().then(() => logger.info('Redis connected')).catch(() => {
    logger.warn('Redis unavailable — sessions use L1+DB only');
    redis = null;
  });
}
import { v4 as uuidv4 } from 'uuid';
import { LMStudioClient } from "@lmstudio/sdk";
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const MCP_SERVER_PATH = process.env.MCP_SERVER_PATH || path.join(__dirname, '../mcp-server/index.js');
const API_URL = process.env.API_URL || 'http://localhost:3001';

const BASE_SYSTEM_PROMPT = `You are Yamo, a helpful AI assistant for Restaurant.
KNOWLEDGE BASE:
- Use the OFFICIAL MENU DATA provided below to respond to menu queries.
- ALWAYS use the EXACT 'idx' value from the data for the [image:menu:IDX] token.
- NEVER name or price items from memory. If an item is not in the data, you may call get_menu to search for it.

IMAGE DISPLAY RULE (CRITICAL for grid layout):
- Display EACH item using this EXACT format (Image line FIRST):
[image:menu:IDX]
**Item Name** — Price XAF

- EXAMPLE (if data has idx 20 for Poulet braisé):
## Poulets
[image:menu:20]
**Poulet braisé** — 2,800 XAF

Rules:
- The [image:menu:IDX] line MUST come BEFORE the name/price.
- Use ## for category headings.
- NEVER use bullet points (-) or tables for the menu.
- NEVER mention the 'idx' number in your natural language text (e.g., don't write "Poulet (idx:20)"). The ID is only for the [image:menu:IDX] tag.

Guidelines:
- Always be friendly and warm.
- Confirm order details before creating them.
- ALWAYS provide the Order ID to the customer immediately after a successful order creation (the ID is returned by the tool).
- If the customer wants to place an order, you MUST ask them to choose an Agence (Branch) and provide a Delivery Address. Do NOT ask for this if they are just chatting or asking questions.
- When a customer wants to update or cancel an order, you MUST ask for their Order ID first. Do NOT attempt to update or cancel without an ID.
- Use cancel_orders_bulk for multiple cancellations.

You represent the warmth and hospitality of Cameroonian culture. Bienvenue chez Restaurant!`;

// Returns system prompt as content blocks.
// BASE_SYSTEM_PROMPT is marked cache_control so Anthropic caches it server-side
// after the first call — subsequent turns pay ~10% of normal input token cost for it.
let menuCache = null;
let lastMenuFetch = 0;
const MENU_TTL = 300000; // 5 minutes

async function getFullMenu() {
  if (menuCache && (Date.now() - lastMenuFetch < MENU_TTL)) return menuCache;
  try {
    const res = await globalThis.fetch(`${API_URL}/api/menu`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      menuCache = data.data.map(item => ({
        idx: item.idx,
        name: item.name,
        price: item.price,
        category: item.category?.name || item.category,
        available: item.available
      }));
      lastMenuFetch = Date.now();
      return menuCache;
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Failed to fetch menu for prompt injection');
  }
  return menuCache || [];
}

let branchCache = null;
let lastBranchFetch = 0;

async function getFullBranches() {
  if (branchCache && (Date.now() - lastBranchFetch < MENU_TTL)) return branchCache;
  try {
    const res = await globalThis.fetch(`${API_URL}/api/branches`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      branchCache = data.data.map(b => ({
        id: b._id,
        name: b.name,
        location: b.location
      }));
      lastBranchFetch = Date.now();
      return branchCache;
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Failed to fetch branches for prompt injection');
  }
  return branchCache || [];
}

async function getSystemPromptBlocks(language, customerProfile = null) {
  const [menu, branches] = await Promise.all([getFullMenu(), getFullBranches()]);
  
  const menuList = menu.map(m => `[image:menu:${m.idx}]\n**${m.name}** — ${m.price} XAF\nCat: ${m.category}${m.available ? '' : ' [EPUISÉ]'}`).join('\n\n');
  const branchList = branches.map(b => `- ${b.name} (ID: ${b.id}) - ${b.location}`).join('\n');
  
  const menuKnowledge = `\n\nOFFICIAL MENU DATA:\n${menuList}\n\n`;
  const branchKnowledge = `\n\nOFFICIAL BRANCHES (AGENCES):\n${branchList}\n\n`;

  const defaultLang = language === 'en' ? 'English' : 'French';
  const langInstruction = `\n\nLANGUAGE RULE: The user's preferred language is ${defaultLang}. Always respond in the same language the user writes in. If the user writes in French, respond in French. If the user writes in English, respond in English. If the user writes in another language, respond in that language. When the user's message is ambiguous or very short (e.g. "ok", "yes"), default to ${defaultLang}.`;
  
  const customerInstruction = customerProfile?.name
    ? `\n\nCUSTOMER INFO: You are currently talking to ${customerProfile.name} (Phone: ${customerProfile.phone}). You MUST address them by their name: ${customerProfile.name}. If they ask "tu connais mon nom" or "quel est mon nom", you MUST reply "Oui, vous êtes ${customerProfile.name}!"`
    : '';

  const dynamic = menuKnowledge + branchKnowledge + langInstruction + customerInstruction;
  return BASE_SYSTEM_PROMPT + dynamic;
}

const client = new LMStudioClient({
  baseUrl: process.env.LMSTUDIO_SERVER_URL || "ws://localhost:1234",
});

let model = null;
async function loadModel() {
  let modelPath = (process.env.LMSTUDIO_MODEL_PATH || '').trim();
  const loadedModels = await client.llm.listLoaded();

  if (!modelPath) {
    logger.warn('LMSTUDIO_MODEL_PATH not set, attempting to use the first loaded model');
    if (loadedModels.length > 0) {
      model = await client.llm.model(loadedModels[0].path || loadedModels[0].identifier);
    } else {
      throw new Error("No models loaded in LM Studio and LMSTUDIO_MODEL_PATH is not set.");
    }
  } else {
    // Try to find the model by identifier or path among loaded models
    const targetModel = loadedModels.find(m => m.identifier === modelPath || m.path === modelPath);
    if (targetModel) {
      model = await client.llm.model(targetModel.path || targetModel.identifier);
    } else {
      logger.warn({ modelPath, loaded: loadedModels.map(m => ({ identifier: m.identifier, path: m.path })) }, 'Specified model not found among loaded models, attempting to load directly');
      model = await client.llm.model(modelPath);
    }
  }
  logger.info({ model: model.path || model.id }, 'LM Studio model loaded');
}

// Async queue — limits concurrent Claude API calls to prevent overload
// concurrency: max parallel Claude calls; max queue size beyond that returns 429
const claudeQueue = new PQueue({ concurrency: 5 });
const QUEUE_MAX = 20;

// In-memory session cache: sessionId -> { messages, uiMessages, title, createdAt }
// LRU-lite: evict the oldest entry when the Map exceeds MAX_SESSIONS
const MAX_SESSIONS = 500;
const sessions = new Map();

function evictOldestSession() {
  if (sessions.size >= MAX_SESSIONS) {
    const oldestKey = sessions.keys().next().value;
    sessions.delete(oldestKey);
  }
}

function sessionSet(id, session) {
  // L1: in-memory LRU
  sessions.delete(id);
  evictOldestSession();
  sessions.set(id, session);
  // L2: Redis (fire-and-forget, TTL 24h)
  if (redis) {
    redis.setex(`session:${id}`, SESSION_TTL, JSON.stringify(session))
      .catch((err) => logger.warn({ err: err.message }, 'Redis session write failed'));
  }
  activeSessions.set(sessions.size);
}

let mcpClient = null;
let anthropicTools = [];

// ─── Session persistence ────────────────────────────────────────────────────

function sanitizeApiMessages(messages) {
  return (messages || []).map((msg) => {
    if (!Array.isArray(msg.content)) return msg;
    return {
      ...msg,
      content: msg.content.map((block) => {
        if (block.type === 'tool_use' && block.input === undefined) {
          return { ...block, input: {} };
        }
        return block;
      })
    };
  });
}

async function loadSession(sessionId) {
  if (!sessionId) return null;

  // L1: in-memory hit
  if (sessions.has(sessionId)) return sessions.get(sessionId);

  // L2: Redis hit
  if (redis) {
    try {
      const raw = await redis.get(`session:${sessionId}`);
      if (raw) {
        const session = JSON.parse(raw);
        session.createdAt = new Date(session.createdAt);
        sessions.set(sessionId, session); // warm L1
        logger.info({ sessionId }, 'Session loaded from Redis');
        return session;
      }
    } catch (err) {
      logger.warn({ err: err.message }, 'Redis session read failed');
    }
  }

  // L3: DB fallback
  try {
    const res = await fetch(`${API_URL}/api/conversations/${sessionId}`);
    if (res.ok) {
      const { success, data } = await res.json();
      if (success && data) {
        const session = {
          messages: sanitizeApiMessages(data.apiMessages),
          uiMessages: data.uiMessages || [],
          title: data.title,
          createdAt: new Date(data.createdAt)
        };
        sessionSet(sessionId, session);
        logger.info({ sessionId, msgs: session.messages.length }, 'Session loaded from DB');
        return session;
      }
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Session DB load failed');
  }
  return null;
}

function createSession(clientId = null) {
  return { messages: [], uiMessages: [], title: null, createdAt: new Date(), clientId };
}

async function persistSession(sessionId, session) {
  try {
    await fetch(`${API_URL}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        title: session.title || 'New conversation',
        apiMessages: session.messages,
        uiMessages: session.uiMessages,
        clientId: session.clientId || null
      })
    });
  } catch (err) {
    logger.warn({ err: err.message }, 'Session DB persist failed');
  }
}

// ─── MCP ────────────────────────────────────────────────────────────────────

async function initMCP() {
  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: [MCP_SERVER_PATH],
      env: { ...process.env, API_URL }
    });
    mcpClient = new Client({ name: 'restaurant-agent', version: '1.0.0' }, { capabilities: {} });
    await mcpClient.connect(transport);

    const { tools } = await mcpClient.listTools();
    anthropicTools = tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema
      }
    }));
    logger.info({ tools: tools.map((t) => t.name) }, 'MCP ready');
  } catch (err) {
    logger.error({ err: err.message }, 'MCP init failed');
  }
}

const MCP_TIMEOUT_MS = 10_000;
const MCP_MAX_RETRIES = 2;

async function callMCPTool(name, input) {
  if (!mcpClient) throw new Error('MCP client not initialized');

  for (let attempt = 0; attempt <= MCP_MAX_RETRIES; attempt++) {
    try {
      const result = await Promise.race([
        mcpClient.callTool({ name, arguments: input }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`MCP tool "${name}" timed out after ${MCP_TIMEOUT_MS}ms`)), MCP_TIMEOUT_MS)
        )
      ]);
      return result;
    } catch (err) {
      if (attempt === MCP_MAX_RETRIES) throw err;
      // Exponential backoff: 200ms, 400ms
      await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)));
    }
  }
}

// Post-process get_menu tool result:
// - Uses the persistent media.idx field from the Media document
// - Strips _id and media fields (Claude never needs them)
function processMenuToolResult(rawText) {
  try {
    const data = JSON.parse(rawText);
    if (data.success && Array.isArray(data.data)) {
      data.data = data.data.map((item) => {
        const { _id, media, ...rest } = item;
        return rest; // idx is now a direct field on MenuItem
      });
      return JSON.stringify(data);
    }
  } catch { }
  return rawText;
}

// Post-process order tool results: keep only what Claude needs, strip the rest
function compressOrder(order) {
  const o = {
    id: order._id,
    status: order.status,
    total: order.totalAmount,
    items: (order.items || []).map(({ name, quantity, price }) => ({ name, quantity, price }))
  };
  if (order.customer?.name) o.customer = { name: order.customer.name, phone: order.customer.phone };
  if (order.createdAt) o.at = order.createdAt;
  if (order.deliveryAddress) o.delivery = order.deliveryAddress;
  if (order.notes) o.notes = order.notes;
  return o;
}

function processOrderToolResult(rawText) {
  try {
    const data = JSON.parse(rawText);
    if (data.success && Array.isArray(data.data)) {
      data.data = data.data.map(compressOrder);
      return JSON.stringify(data);
    }
    if (data.success && data.data?._id) {
      data.data = compressOrder(data.data);
      return JSON.stringify(data);
    }
  } catch { }
  return rawText;
}

const ORDER_TOOLS = new Set(['list_orders', 'get_order', 'create_order', 'cancel_order', 'cancel_orders_bulk', 'update_order']);

function processToolResult(toolName, raw) {
  if (toolName === 'get_menu') return processMenuToolResult(raw);
  if (ORDER_TOOLS.has(toolName)) return processOrderToolResult(raw);
  return raw;
}

// ─── Token optimisation helpers ─────────────────────────────────────────────

// Strip [image:type:idx] tokens from assistant history (Claude doesn't need them in context)
function stripImageUrls(content) {
  return content.map((block) => {
    if (block.type === 'text') {
      return { ...block, text: block.text.replace(/\[image:[^\]]+\]/g, '') };
    }
    return block;
  });
}

// Replace old get_menu tool_result bodies with a 1-line summary.
// The full menu JSON can be ~1000 tokens — keeping stale copies wastes context.
// We keep only the LAST get_menu result intact so Claude can still reference it.
function compressOldMenuResults(messages) {
  // Find all indices where a tool_result for get_menu appears
  const menuResultIndices = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'user' && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'tool_result' && block._toolName === 'get_menu') {
          menuResultIndices.push(i);
        }
      }
    }
  }
  if (menuResultIndices.length <= 1) return messages; // nothing to compress

  // Compress all but the last get_menu result
  const toCompress = new Set(menuResultIndices.slice(0, -1));
  return messages.map((msg, i) => {
    if (!toCompress.has(i)) return msg;
    return {
      ...msg,
      content: msg.content.map((block) => {
        if (block.type === 'tool_result' && block._toolName === 'get_menu') {
          return { ...block, content: '[Menu already fetched — see earlier display]' };
        }
        return block;
      })
    };
  });
}

// Option A: rolling window — only send the last MAX_API_MESSAGES to Claude
const MAX_API_MESSAGES = 16;
function truncateForApi(messages) {
  const compressed = compressOldMenuResults(messages);
  const windowed = compressed.length <= MAX_API_MESSAGES ? compressed : (() => {
    let start = compressed.length - MAX_API_MESSAGES;
    while (start < compressed.length) {
      const msg = compressed[start];
      if (msg.role === 'user' && typeof msg.content === 'string') break;
      start++;
    }
    return compressed.slice(start);
  })();
  // Strip internal _toolName tags before sending to Claude
  return windowed.map((msg) => {
    if (!Array.isArray(msg.content)) return msg;
    return {
      ...msg,
      content: msg.content.map(({ _toolName, ...block }) => block)
    };
  });
}

// ─── Error helper ───────────────────────────────────────────────────────────

function friendlyError(err, language = 'fr') {
  const status = err.status || err.statusCode;
  const isFr = language !== 'en';
  if (status === 429) return isFr
    ? "Le serveur est un peu débordé — veuillez patienter quelques secondes ! 🙏"
    : "The server is a little overwhelmed — please wait a few seconds! 🙏";
  return isFr
    ? "Une erreur s'est produite avec le service d'IA locale. Veuillez réessayer ! 😊"
    : "Something went wrong with the local AI service. Please try again! 😊";
}

// ─── Express app ────────────────────────────────────────────────────────────

const app = express();
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/metrics' } }));

// Track HTTP duration per route
app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => end({ method: req.method, route: req.path, status: res.statusCode }));
  next();
});

// CORS — restrict to configured origins (default: localhost dev)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'];
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, same-origin)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  }
}));

// Rate limiting — 60 requests/minute per IP on chat endpoint
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' }
});
app.use('/api/chat', chatLimiter);

app.use(express.json({ limit: '64kb' }));

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', mcpConnected: !!mcpClient, toolsLoaded: anthropicTools.length, activeSessions: sessions.size, queue: { pending: claudeQueue.pending, size: claudeQueue.size, max: QUEUE_MAX } }
  });
});

// ─── Streaming chat endpoint ─────────────────────────────────────────────────

app.post('/api/chat/stream', async (req, res) => {
  // Reject early (before SSE headers) if queue is overloaded
  if (claudeQueue.size >= QUEUE_MAX) {
    return res.status(503).json({ success: false, message: 'Server busy, please try again in a moment.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const { message, sessionId: existingId, language = 'fr', customerProfile = null, clientId = null } = req.body;
    if (!message?.trim()) { send({ type: 'error', message: 'Message is required' }); return res.end(); }
    if (message.length > 2000) { send({ type: 'error', message: 'Message too long (max 2000 characters).' }); return res.end(); }

    // Load or create session
    let sessionId = existingId;
    let session = existingId ? await loadSession(existingId) : null;
    if (!session) {
      sessionId = uuidv4();
      session = createSession(clientId);
      sessionSet(sessionId, session);
    } else if (clientId && !session.clientId) {
      session.clientId = clientId; // backfill on first message for existing sessions
    }

    send({ type: 'start', sessionId });

    // Set title from first user message
    if (!session.title) session.title = message.trim().substring(0, 60);

    // Add user message to both histories
    session.messages.push({ role: 'user', content: message.trim() });
    session.uiMessages.push({ id: uuidv4(), role: 'user', content: message.trim(), timestamp: new Date() });

    let iterations = 0;
    let totalAssistantText = '';

    // Agentic loop runs inside the queue — limits concurrent inference calls to 5
    await claudeQueue.add(async () => {
      if (!model) await loadModel();

      while (iterations++ < 10) {
        const systemPrompt = await getSystemPromptBlocks(language, customerProfile);
        const history = [
          { role: 'system', content: systemPrompt },
          ...truncateForApi(session.messages)
        ];

        const prediction = model.respond(history, {
          maxTokens: 4096,
          tools: anthropicTools
        });

        let assistantMessage = { role: 'assistant', content: '', toolCalls: [] };

        for await (const fragment of prediction) {
          if (fragment.content) {
            assistantMessage.content += fragment.content;
            totalAssistantText += fragment.content;
            send({ type: 'token', text: fragment.content });
          }
          if (fragment.toolCalls) {
            assistantMessage.toolCalls.push(...fragment.toolCalls);
          }
        }

        logger.info({ turn: iterations, queueSize: claudeQueue.size }, 'Inference turn completed');
        queueSize.set(claudeQueue.size);

        // Sanitize assistant content for history
        session.messages.push({
          role: 'assistant',
          content: stripImageUrls([{ type: 'text', text: assistantMessage.content }])[0].text,
          tool_calls: assistantMessage.toolCalls.length > 0 ? assistantMessage.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.parameters) }
          })) : undefined
        });

        if (assistantMessage.toolCalls.length === 0) {
          if (totalAssistantText) {
            session.uiMessages.push({ id: uuidv4(), role: 'assistant', content: totalAssistantText, timestamp: new Date() });
          }
          await persistSession(sessionId, session);
          break;
        }

        const toolResults = [];
        for (const toolCall of assistantMessage.toolCalls) {
          send({ type: 'tool_call', name: toolCall.name });
          try {
            const result = await callMCPTool(toolCall.name, toolCall.parameters);
            const raw = (result.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n')
              || JSON.stringify(result);
            const text = processToolResult(toolCall.name, raw);

            toolResults.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: text,
              _toolName: toolCall.name // for local identification
            });

            if ((toolCall.name === 'save_customer_details' || toolCall.name === 'create_order') && toolCall.parameters?.customerName) {
              send({ type: 'customer_identified', name: toolCall.parameters.customerName, phone: toolCall.parameters.customerPhone || '' });
            }
          } catch (err) {
            toolResults.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: err.message }),
              is_error: true
            });
          }
        }
        session.messages.push(...toolResults);
      }
    });

    send({ type: 'done' });
    res.end();
  } catch (err) {
    logger.error({ status: err.status, err: err.message }, 'Stream error');
    try { send({ type: 'error', message: friendlyError(err, language) }); } catch { }
    res.end();
  }
});

// ─── Non-streaming chat (kept for compatibility) ─────────────────────────────

app.post('/api/chat', async (req, res) => {
  const language = req.body?.language || 'fr';
  try {
    const { message, sessionId: existingId } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message is required' });

    let sessionId = existingId;
    let session = existingId ? await loadSession(existingId) : null;
    if (!session) {
      sessionId = uuidv4();
      session = createSession();
      sessionSet(sessionId, session);
    }

    if (!session.title) session.title = message.trim().substring(0, 60);
    session.messages.push({ role: 'user', content: message.trim() });
    session.uiMessages.push({ id: uuidv4(), role: 'user', content: message.trim(), timestamp: new Date() });

    let finalAssistantText = '', iterations = 0;
    while (iterations++ < 10) {
      if (!model) await loadModel();

      const systemPrompt = await getSystemPromptBlocks(language);
      const history = [
        { role: 'system', content: systemPrompt },
        ...truncateForApi(session.messages)
      ];

      const prediction = model.respond(history, {
        maxTokens: 4096,
        tools: anthropicTools
      });

      let assistantMessage = { role: 'assistant', content: '', toolCalls: [] };

      for await (const fragment of prediction) {
        if (fragment.content) assistantMessage.content += fragment.content;
        if (fragment.toolCalls) assistantMessage.toolCalls.push(...fragment.toolCalls);
      }

      session.messages.push({
        role: 'assistant',
        content: stripImageUrls([{ type: 'text', text: assistantMessage.content }])[0].text,
        tool_calls: assistantMessage.toolCalls.length > 0 ? assistantMessage.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.parameters) }
        })) : undefined
      });

      if (assistantMessage.toolCalls.length === 0) {
        finalAssistantText = assistantMessage.content;
        break;
      }

      const toolResults = [];
      for (const tc of assistantMessage.toolCalls) {
        try {
          const r = await callMCPTool(tc.name, tc.parameters);
          const raw = (r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
          const text = processToolResult(tc.name, raw);
          toolResults.push({ role: 'tool', tool_call_id: tc.id, content: text, _toolName: tc.name });
        } catch (err) {
          toolResults.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: err.message }), is_error: true });
        }
      }
      session.messages.push(...toolResults);
    }

    if (finalAssistantText) session.uiMessages.push({ id: uuidv4(), role: 'assistant', content: finalAssistantText, timestamp: new Date() });
    await persistSession(sessionId, session);

    res.json({ success: true, data: { response: finalAssistantText, sessionId } });
  } catch (err) {
    logger.error({ status: err.status, err: err.message }, 'Chat error');
    res.status(500).json({ success: false, message: friendlyError(err, language) });
  }
});

// ─── Session management ───────────────────────────────────────────────────────

app.delete('/api/chat/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  sessions.delete(sessionId);
  activeSessions.set(sessions.size);
  if (redis) redis.del(`session:${sessionId}`).catch(() => { });
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (req.headers['x-client-id']) headers['x-client-id'] = req.headers['x-client-id'];
    await fetch(`${API_URL}/api/conversations/${sessionId}`, { method: 'DELETE', headers });
  } catch { }
  res.json({ success: true, message: `Session ${sessionId} cleared` });
});

// ─── Image resolution endpoint (for the chat UI) ─────────────────────────────
// GET /api/images/menu/:idx → MenuItem.idx → MenuItem.media → Media doc
// Follows the DB relation so a media swap is always reflected correctly.

app.get('/api/images/:type/:idx', async (req, res) => {
  const { idx } = req.params;
  const idxNum = parseInt(idx);
  if (isNaN(idxNum)) return res.status(400).json({ success: false, message: 'Invalid idx' });

  try {
    const r = await fetch(`${API_URL}/api/menu/by-idx/${idxNum}`);
    if (!r.ok) { res.status(r.status).json(await r.json()); return; }
    const { data: item } = await r.json();
    if (!item?.media) return res.status(404).json({ success: false, message: 'No media for this item' });
    res.json({ success: true, data: item.media });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to resolve media' });
  }
});

// ─── Conversation proxy endpoints (for the chat UI) ───────────────────────────

app.get('/api/conversations', async (req, res) => {
  try {
    const qs = new URLSearchParams();
    if (req.query.page) qs.set('page', req.query.page);
    if (req.query.limit) qs.set('limit', req.query.limit);
    const url = `${API_URL}/api/conversations${qs.toString() ? `?${qs}` : ''}`;
    const headers = {};
    if (req.headers['x-client-id']) headers['x-client-id'] = req.headers['x-client-id'];
    const r = await fetch(url, { headers });
    res.status(r.status).json(await r.json());
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
});

app.get('/api/conversations/:sessionId', async (req, res) => {
  try {
    const r = await fetch(`${API_URL}/api/conversations/${req.params.sessionId}`);
    res.status(r.status).json(await r.json());
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch conversation' });
  }
});

app.patch('/api/conversations/:sessionId/rename', async (req, res) => {
  try {
    const r = await fetch(`${API_URL}/api/conversations/${req.params.sessionId}/rename`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    res.status(r.status).json(await r.json());
    // Update in-memory cache if present
    const session = sessions.get(req.params.sessionId);
    if (session && req.body.title) session.title = req.body.title.trim();
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to rename conversation' });
  }
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown() {
  if (mcpClient) await mcpClient.close().catch(() => { });
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ─── Start ────────────────────────────────────────────────────────────────────

async function start() {
  await initMCP();
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Restaurant Agent running');
  });
}
start().catch((err) => { logger.fatal({ err }, 'Fatal startup error'); process.exit(1); });
