import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const MCP_SERVER_PATH = process.env.MCP_SERVER_PATH || path.join(__dirname, '../mcp-server/index.js');
const API_URL = process.env.API_URL || 'http://localhost:3001';

const SYSTEM_PROMPT = `You are a helpful AI assistant for Restaurant restaurant, a wonderful Cameroonian restaurant. Your name is Yamo.

Your role is to help customers:
- Browse and explore the menu (categories: Beignets, Salades, Boisson, Poulets, Burger, Menus Composés)
- Get details about specific dishes and their prices
- Place new orders
- Check order status
- Update or cancel existing orders

Guidelines:
- Always be friendly, warm, and helpful
- When a customer wants to place an order, ALWAYS confirm the full order details (items, quantities, total amount) before creating it
- Ask for the customer's name and phone number when placing orders
- The currency is XAF (Central African Franc / Franc CFA)
- Format prices clearly (e.g., "1,500 XAF" or "XAF 1,500")
- If an item is marked as unavailable (épuisé), inform the customer politely and suggest alternatives
- When showing the menu, organize it clearly by category
- Be concise but informative
- If you need to look up menu items to place an order, use the get_menu tool first to find item IDs
- Always provide order IDs to customers so they can track their orders

You represent the warmth and hospitality of Cameroonian culture. Bienvenue chez Restaurant!`;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In-memory session cache: sessionId -> { messages, uiMessages, title, createdAt }
const sessions = new Map();

let mcpClient = null;
let anthropicTools = [];

// ─── Session persistence ────────────────────────────────────────────────────

async function loadSession(sessionId) {
  if (!sessionId) return null;

  // In-memory cache hit
  if (sessions.has(sessionId)) return sessions.get(sessionId);

  // Load from DB
  try {
    const res = await fetch(`${API_URL}/api/conversations/${sessionId}`);
    if (res.ok) {
      const { success, data } = await res.json();
      if (success && data) {
        const session = {
          messages: data.apiMessages || [],
          uiMessages: data.uiMessages || [],
          title: data.title,
          createdAt: new Date(data.createdAt)
        };
        sessions.set(sessionId, session);
        console.log(`[Session] Loaded ${sessionId} from DB (${session.messages.length} msgs)`);
        return session;
      }
    }
  } catch (err) {
    console.error('[Session] DB load failed:', err.message);
  }
  return null;
}

function createSession() {
  return { messages: [], uiMessages: [], title: null, createdAt: new Date() };
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
        uiMessages: session.uiMessages
      })
    });
  } catch (err) {
    console.error('[Session] DB persist failed:', err.message);
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
    mcpClient = new Client({ name: 'tchopetyamo-agent', version: '1.0.0' }, { capabilities: {} });
    await mcpClient.connect(transport);

    const { tools } = await mcpClient.listTools();
    anthropicTools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema
    }));
    console.log(`MCP ready: ${tools.map((t) => t.name).join(', ')}`);
  } catch (err) {
    console.error('MCP init failed:', err.message);
  }
}

async function callMCPTool(name, input) {
  if (!mcpClient) throw new Error('MCP client not initialized');
  return mcpClient.callTool({ name, arguments: input });
}

// ─── Error helper ───────────────────────────────────────────────────────────

function friendlyError(err) {
  const status = err.status || err.statusCode;
  if (status === 429) return "I'm a little overwhelmed right now — please wait a few seconds and try again! 🙏";
  if (status === 401 || status === 403) return "I'm having an authentication issue. Please contact the restaurant staff.";
  if (status >= 500) return "I'm having trouble reaching my brain right now. Please try again in a moment.";
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') return "I can't reach the restaurant system. Please try again shortly.";
  return "Something went wrong on my end. Please try again! 😊";
}

// ─── Express app ────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', mcpConnected: !!mcpClient, toolsLoaded: anthropicTools.length, activeSessions: sessions.size }
  });
});

// ─── Streaming chat endpoint ─────────────────────────────────────────────────

app.post('/api/chat/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const { message, sessionId: existingId } = req.body;
    if (!message?.trim()) { send({ type: 'error', message: 'Message is required' }); return res.end(); }

    // Load or create session
    let sessionId = existingId;
    let session = existingId ? await loadSession(existingId) : null;
    if (!session) {
      sessionId = uuidv4();
      session = createSession();
      sessions.set(sessionId, session);
    }

    send({ type: 'start', sessionId });

    // Set title from first user message
    if (!session.title) session.title = message.trim().substring(0, 60);

    // Add user message to both histories
    session.messages.push({ role: 'user', content: message.trim() });
    session.uiMessages.push({ id: uuidv4(), role: 'user', content: message.trim(), timestamp: new Date() });

    let iterations = 0;
    let totalAssistantText = '';

    while (iterations++ < 10) {
      const stream = anthropic.messages.stream({
        model: 'claude-opus-4-5',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: session.messages,
        ...(anthropicTools.length > 0 ? { tools: anthropicTools } : {})
      });

      stream.on('text', (text) => {
        totalAssistantText += text;
        send({ type: 'token', text });
      });

      const finalMessage = await stream.finalMessage();
      session.messages.push({ role: 'assistant', content: finalMessage.content });

      if (finalMessage.stop_reason === 'end_turn') {
        if (totalAssistantText) {
          session.uiMessages.push({ id: uuidv4(), role: 'assistant', content: totalAssistantText, timestamp: new Date() });
        }
        await persistSession(sessionId, session);
        break;
      }

      if (finalMessage.stop_reason === 'tool_use') {
        const toolResults = [];
        for (const toolUse of finalMessage.content.filter((b) => b.type === 'tool_use')) {
          send({ type: 'tool_call', name: toolUse.name });
          try {
            const result = await callMCPTool(toolUse.name, toolUse.input);
            const text = (result.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n')
              || JSON.stringify(result);
            toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: text });
          } catch (err) {
            toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ error: err.message }), is_error: true });
          }
        }
        session.messages.push({ role: 'user', content: toolResults });
      } else {
        break;
      }
    }

    send({ type: 'done' });
    res.end();
  } catch (err) {
    console.error('Stream error:', err.status || '', err.message);
    try { send({ type: 'error', message: friendlyError(err) }); } catch {}
    res.end();
  }
});

// ─── Non-streaming chat (kept for compatibility) ─────────────────────────────

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId: existingId } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message is required' });

    let sessionId = existingId;
    let session = existingId ? await loadSession(existingId) : null;
    if (!session) {
      sessionId = uuidv4();
      session = createSession();
      sessions.set(sessionId, session);
    }

    if (!session.title) session.title = message.trim().substring(0, 60);
    session.messages.push({ role: 'user', content: message.trim() });
    session.uiMessages.push({ id: uuidv4(), role: 'user', content: message.trim(), timestamp: new Date() });

    let response, iterations = 0;
    while (iterations++ < 10) {
      response = await anthropic.messages.create({
        model: 'claude-opus-4-5', max_tokens: 4096, system: SYSTEM_PROMPT,
        messages: session.messages,
        ...(anthropicTools.length > 0 ? { tools: anthropicTools } : {})
      });
      session.messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'end_turn') break;
      if (response.stop_reason === 'tool_use') {
        const toolResults = [];
        for (const t of response.content.filter((b) => b.type === 'tool_use')) {
          try {
            const r = await callMCPTool(t.name, t.input);
            const text = (r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
            toolResults.push({ type: 'tool_result', tool_use_id: t.id, content: text });
          } catch (err) {
            toolResults.push({ type: 'tool_result', tool_use_id: t.id, content: JSON.stringify({ error: err.message }), is_error: true });
          }
        }
        session.messages.push({ role: 'user', content: toolResults });
      } else break;
    }

    const finalText = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    if (finalText) session.uiMessages.push({ id: uuidv4(), role: 'assistant', content: finalText, timestamp: new Date() });
    await persistSession(sessionId, session);

    res.json({ success: true, data: { response: finalText, sessionId } });
  } catch (err) {
    console.error('Chat error:', err.status || '', err.message);
    res.status(500).json({ success: false, message: friendlyError(err) });
  }
});

// ─── Session management ───────────────────────────────────────────────────────

app.delete('/api/chat/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  sessions.delete(sessionId);
  try { await fetch(`${API_URL}/api/conversations/${sessionId}`, { method: 'DELETE' }); } catch {}
  res.json({ success: true, message: `Session ${sessionId} cleared` });
});

// ─── Conversation proxy endpoints (for the chat UI) ───────────────────────────

app.get('/api/conversations', async (req, res) => {
  try {
    const r = await fetch(`${API_URL}/api/conversations`);
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
  if (mcpClient) await mcpClient.close().catch(() => {});
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ─── Start ────────────────────────────────────────────────────────────────────

async function start() {
  await initMCP();
  app.listen(PORT, () => {
    console.log(`Restaurant Agent running on port ${PORT}`);
  });
}
start().catch((err) => { console.error(err); process.exit(1); });
