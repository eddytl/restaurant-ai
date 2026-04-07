import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { LMStudioClient } from "@lmstudio/sdk"

const app  = express()
const PORT = process.env.PORT || 3002
const API_URL = process.env.API_URL || 'http://localhost:3001'

app.use(cors())
app.use(express.json())

const client = new LMStudioClient({
  baseUrl: process.env.LMSTUDIO_SERVER_URL || "ws://localhost:1234",
})

let model = null
async function loadModel() {
  const modelPath = process.env.LMSTUDIO_MODEL_PATH
  if (!modelPath) {
    const loaded = await client.llm.listLoaded()
    if (loaded.length > 0) model = await client.llm.model(loaded[0].path || loaded[0].identifier)
    else throw new Error("No models loaded in LM Studio")
  } else {
    model = await client.llm.model(modelPath)
  }
}

// ─── Error sanitizer ──────────────────────────────────────────────────────────
function userFriendlyError(err) {
  const msg = err?.message || ''
  if (err?.status === 401 || msg.includes('authentication'))
    return 'Service IA temporairement indisponible. Veuillez réessayer plus tard.'
  if (err?.status === 429 || msg.includes('rate limit'))
    return 'Service IA surchargé. Veuillez patienter quelques instants.'
  if (err?.status === 400 && msg.includes('credit'))
    return 'Service IA temporairement indisponible. Veuillez réessayer plus tard.'
  if (err?.status >= 500 || msg.includes('overloaded'))
    return 'Service IA momentanément indisponible. Réessayez dans quelques secondes.'
  if (msg.includes('JSON') || msg.includes('parse'))
    return 'Réponse IA invalide. Relancez l\'analyse.'
  if (msg.includes('fetch') || msg.includes('ECONNREFUSED'))
    return 'Impossible de joindre l\'API ou LM Studio. Vérifiez que les serveurs sont démarrés.'
  return 'Une erreur est survenue avec le service d\'IA locale. Veuillez réessayer.'
}

// ─── Health ──────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// ─── API status (in-memory, updated on each Anthropic call) ──────────────────
let apiStatus = { state: 'unknown', checkedAt: null }

function setApiStatus(state) {
  apiStatus = { state, checkedAt: new Date().toISOString() }
}

// GET /api-status — returns last known LM Studio API state
app.get('/api-status', async (_req, res) => {
  try {
    const loaded = await client.llm.getLoadedModels()
    if (loaded.length > 0) {
      setApiStatus('ok')
    } else {
      setApiStatus('no_models_loaded')
    }
  } catch (err) {
    setApiStatus('error')
  }
  res.json(apiStatus)
})

// ─── Data helpers ─────────────────────────────────────────────────────────────
async function fetchJSON(path) {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error(`API error: ${path} → ${res.status}`)
  return res.json()
}

async function gatherData(branchId) {
  const qs = branchId ? `?branch=${branchId}` : ''

  const [ordersRes, customersRes, menuRes, branchesRes] = await Promise.all([
    fetchJSON(`/api/orders?limit=200${branchId ? '&branch=' + branchId : ''}`),
    fetchJSON(`/api/customers?limit=200${branchId ? '&preferredBranch=' + branchId : ''}`),
    fetchJSON('/api/menu'),
    fetchJSON('/api/branches'),
  ])

  const orders    = ordersRes.data    || []
  const customers = customersRes.data || []
  const menuItems = menuRes.data      || []
  const branches  = branchesRes.data  || []

  // ── Orders stats ──
  const totalOrders    = orders.length
  const totalRevenue   = orders.reduce((s, o) => s + (o.total || 0), 0)
  const avgOrderValue  = totalOrders ? (totalRevenue / totalOrders).toFixed(0) : 0
  const statusCounts   = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {})

  // ── Top items ──
  const itemFreq = {}
  for (const order of orders) {
    for (const item of (order.items || [])) {
      const name = item.name || item.itemId
      itemFreq[name] = (itemFreq[name] || 0) + (item.quantity || 1)
    }
  }
  const topItems = Object.entries(itemFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, qty]) => ({ name, qty }))

  // ── Customer stats ──
  const totalCustomers = customers.length
  const repeatCustomers = customers.filter(c => (c.orderCount || 0) > 1).length

  // ── Menu overview ──
  const menuByCategory = menuItems.reduce((acc, item) => {
    const cat = item.category?.name || String(item.category || 'Autre')
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {})
  const unavailableItems = menuItems.filter(i => !i.isAvailable).length

  const targetBranch = branchId
    ? branches.find(b => b._id === branchId)
    : null

  return {
    branchName: targetBranch?.name || 'Toutes les agences',
    totalOrders,
    totalRevenue,
    avgOrderValue,
    statusCounts,
    topItems,
    totalCustomers,
    repeatCustomers,
    menuByCategory,
    unavailableItems,
    totalMenuItems: menuItems.length,
    activeBranches: branches.filter(b => b.isActive).length,
  }
}

// ─── Insights — structured alerts ────────────────────────────────────────────
// POST /insights  { branchId?, lang? }
// Returns: { alerts: Alert[], branchName, generatedAt }
// Alert: { id, title, description, criticality: 'critical'|'high'|'medium'|'low',
//           category: 'orders'|'menu'|'customers'|'revenue'|'operations', actions: string[] }
app.post('/insights', async (req, res) => {
  const { branchId, lang = 'fr' } = req.body

  try {
    const stats = await gatherData(branchId || null)
    const langNote = lang === 'en' ? 'Respond in English.' : 'Réponds en français.'

    const systemPrompt = `Tu es un consultant expert en restauration pour un restaurant africain.
Tu analyses des données de performance et génères des alertes business structurées.
${langNote}
Tu DOIS répondre UNIQUEMENT avec un JSON valide, sans texte avant ou après, sans bloc markdown.`

    const userPrompt = `Analyse les données suivantes pour "${stats.branchName}" et génère une liste d'alertes business avec actions correctives.

Données :
- Commandes : ${stats.totalOrders} | CA : ${stats.totalRevenue} FCFA | Moy : ${stats.avgOrderValue} FCFA
- Statuts commandes : ${Object.entries(stats.statusCounts).map(([k,v]) => `${k}=${v}`).join(', ')}
- Top plats : ${stats.topItems.slice(0, 8).map(i => `${i.name}(×${i.qty})`).join(', ')}
- Clients : ${stats.totalCustomers} total, ${stats.repeatCustomers} fidèles (>1 commande)
- Menu : ${stats.totalMenuItems} plats dont ${stats.unavailableItems} indisponibles
- Catégories : ${Object.entries(stats.menuByCategory).map(([k,v]) => `${k}:${v}`).join(', ')}
- Agences actives : ${stats.activeBranches}

Génère entre 4 et 10 alertes. Chaque alerte doit avoir :
- id : identifiant court snake_case
- title : titre court et percutant (max 60 caractères)
- description : description du problème ou opportunité (1-2 phrases)
- criticality : "critical" | "high" | "medium" | "low"
  * critical = bloque le business immédiatement
  * high = impact fort sur revenus/clients, action urgente sous 24h
  * medium = à traiter cette semaine
  * low = amélioration continue
- category : "orders" | "menu" | "customers" | "revenue" | "operations"
- actions : tableau de 2 à 4 actions correctives concrètes et actionnables

Réponds UNIQUEMENT avec ce JSON :
{
  "alerts": [ { "id": "...", "title": "...", "description": "...", "criticality": "...", "category": "...", "actions": ["..."] } ]
}`

    setApiStatus('ok')
    if (!model) await loadModel()

    const prediction = model.respond([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], { maxTokens: 8192 })

    let raw = ''
    for await (const fragment of prediction) {
      raw += fragment.content || ''
    }
    // Strip possible markdown code fences
    const clean = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch (parseErr) {
      console.error('JSON parse error. Raw response:\n', raw.slice(0, 500))
      throw new Error('Réponse IA invalide — réessayez')
    }

    res.json({
      success: true,
      branchName: stats.branchName,
      generatedAt: new Date().toISOString(),
      alerts: parsed.alerts || [],
    })
  } catch (err) {
    console.error('Insights error:', err)
    const msg = err?.message || ''
    if (msg.includes('credit') || err?.status === 400) setApiStatus('insufficient_credits')
    else if (err?.status === 401) setApiStatus('invalid_key')
    else if (err?.status) setApiStatus('error')
    res.status(500).json({ success: false, message: userFriendlyError(err) })
  }
})

// ─── Chat endpoint ────────────────────────────────────────────────────────────
// POST /chat  { messages: [{role,content}], branchId?, lang? }
app.post('/chat', async (req, res) => {
  const { messages = [], branchId, lang = 'fr' } = req.body

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  try {
    const stats = await gatherData(branchId || null)
    const langNote = lang === 'en' ? 'Answer in English.' : 'Réponds en français.'

    const systemPrompt = `Tu es un assistant expert en analyse de performance pour le restaurant "${stats.branchName}".
Tu réponds aux questions de l'administrateur sur la base des données en temps réel ci-dessous.
Sois concis, précis et orienté action. Utilise du Markdown pour structurer tes réponses.
${langNote}

## Données actuelles (${stats.branchName})
- **Commandes** : ${stats.totalOrders} | CA : ${stats.totalRevenue} FCFA | Moy : ${stats.avgOrderValue} FCFA
- **Statuts** : ${Object.entries(stats.statusCounts).map(([k,v]) => `${k}: ${v}`).join(', ')}
- **Top plats** : ${stats.topItems.slice(0, 5).map(i => `${i.name} (×${i.qty})`).join(', ')}
- **Clients** : ${stats.totalCustomers} total, ${stats.repeatCustomers} fidèles
- **Menu** : ${stats.totalMenuItems} plats dont ${stats.unavailableItems} indisponibles
- **Catégories** : ${Object.entries(stats.menuByCategory).map(([k,v]) => `${k}: ${v}`).join(', ')}
- **Agences actives** : ${stats.activeBranches}`

    setApiStatus('ok')
    if (!model) await loadModel()

    const prediction = model.respond([
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ], { maxTokens: 4096 })

    for await (const chunk of prediction) {
      if (chunk.content) {
        send({ type: 'delta', text: chunk.content })
      }
    }

    send({ type: 'done' })
  } catch (err) {
    console.error('Chat error:', err)
    const msg = err?.message || ''
    if (msg.includes('credit') || err?.status === 400) setApiStatus('insufficient_credits')
    else if (err?.status === 401) setApiStatus('invalid_key')
    else if (err?.status) setApiStatus('error')
    send({ type: 'error', message: userFriendlyError(err) })
  } finally {
    res.end()
  }
})

app.listen(PORT, () => console.log(`Admin-agent running on :${PORT}`))
