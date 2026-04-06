<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/composables/useApi'

const { t } = useI18n()

const branches   = ref([])
const branchId   = ref('')
const messages   = ref([])   // { role: 'user'|'assistant', content: string }
const input      = ref('')
const loading    = ref(false)
const chatErr    = ref('')
const chatScroll = ref(null)

const suggestedQuestions = [
  'Quels sont les plats les plus commandés ?',
  'Quel est le chiffre d\'affaires total ?',
  'Combien de clients fidèles avons-nous ?',
  'Quelles commandes sont en attente ?',
]

onMounted(async () => {
  try {
    const res = await api.getBranches({ active: true })
    branches.value = res.data || []
  } catch {}
})

async function send() {
  const text = input.value.trim()
  if (!text || loading.value) return

  input.value = ''
  chatErr.value = ''
  messages.value.push({ role: 'user', content: text })
  messages.value.push({ role: 'assistant', content: '' })
  const idx = messages.value.length - 1
  loading.value = true
  await scrollBottom()

  try {
    const res = await fetch('/api/admin-agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.value.slice(0, -1),
        branchId: branchId.value || undefined,
        lang: 'fr',
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let   buffer  = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        try {
          const p = JSON.parse(line.slice(5).trim())
          if (p.type === 'delta') { messages.value[idx].content += p.text; await scrollBottom() }
          if (p.type === 'error') chatErr.value = p.message
        } catch {}
      }
    }
  } catch (e) {
    chatErr.value = e.message
  } finally {
    loading.value = false
    await scrollBottom()
  }
}

function clearChat() { messages.value = []; chatErr.value = '' }

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
}

async function scrollBottom() {
  await nextTick()
  if (chatScroll.value) chatScroll.value.scrollTop = chatScroll.value.scrollHeight
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function applyInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

function renderTable(rows) {
  const dataRows = rows.filter(r => !/^\|[\s\-:|]+\|?$/.test(r.trim()))
  if (!dataRows.length) return ''
  const splitRow = r => r.split('|').slice(1, -1).map(c => c.trim())
  const headers = splitRow(dataRows[0])
  let html = '<table><thead><tr>'
  headers.forEach(h => { html += `<th>${applyInline(h)}</th>` })
  html += '</tr></thead><tbody>'
  for (let i = 1; i < dataRows.length; i++) {
    html += '<tr>'
    splitRow(dataRows[i]).forEach(c => { html += `<td>${applyInline(c)}</td>` })
    html += '</tr>'
  }
  html += '</tbody></table>'
  return html
}

function renderMarkdown(md) {
  const lines = md.split('\n')
  let html = ''
  let inUl = false, inOl = false, inP = false, tableBuffer = []

  const flushUl  = () => { if (inUl)  { html += '</ul>';  inUl  = false } }
  const flushOl  = () => { if (inOl)  { html += '</ol>';  inOl  = false } }
  const flushP   = () => { if (inP)   { html += '</p>';   inP   = false } }
  const flushTbl = () => { if (tableBuffer.length) { html += renderTable(tableBuffer); tableBuffer = [] } }
  const flushAll = () => { flushUl(); flushOl(); flushP(); flushTbl() }

  for (const line of lines) {
    const t = line.trim()
    if (!t) { flushAll(); continue }
    if (t.startsWith('|')) { flushUl(); flushOl(); flushP(); tableBuffer.push(t); continue }
    else { flushTbl() }

    const h3 = t.match(/^### (.+)/); if (h3) { flushAll(); html += `<h3>${applyInline(h3[1])}</h3>`; continue }
    const h2 = t.match(/^## (.+)/);  if (h2) { flushAll(); html += `<h2>${applyInline(h2[1])}</h2>`; continue }
    const h1 = t.match(/^# (.+)/);   if (h1) { flushAll(); html += `<h1>${applyInline(h1[1])}</h1>`; continue }
    if (/^---+$/.test(t)) { flushAll(); html += '<hr />'; continue }

    const ul = t.match(/^[-*] (.+)/)
    if (ul) { flushOl(); flushP(); if (!inUl) { html += '<ul>'; inUl = true }; html += `<li>${applyInline(ul[1])}</li>`; continue }
    const ol = t.match(/^\d+[.)]\s+(.+)/)
    if (ol) { flushUl(); flushP(); if (!inOl) { html += '<ol>'; inOl = true }; html += `<li>${applyInline(ol[1])}</li>`; continue }

    flushUl(); flushOl()
    if (!inP) { html += '<p>'; inP = true } else { html += ' ' }
    html += applyInline(t)
  }
  flushAll()
  return html
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- ── Top bar ──────────────────────────────────────────────────────────── -->
    <div class="shrink-0 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col sm:flex-row sm:items-center gap-3">
      <div class="flex-1">
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ t('adminChat.title') }}</h1>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ t('adminChat.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="branchId" class="input text-sm py-1.5" :disabled="loading">
          <option value="">{{ t('insights.allBranches') }}</option>
          <option v-for="b in branches" :key="b._id" :value="b._id">{{ b.name }} — {{ b.city }}</option>
        </select>
        <button v-if="messages.length" @click="clearChat"
          class="btn-ghost text-sm px-3 py-1.5 gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          {{ t('insights.chatClear') }}
        </button>
      </div>
    </div>

    <!-- ── Messages area ────────────────────────────────────────────────────── -->
    <div ref="chatScroll" class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
      <!-- Empty state -->
      <div v-if="!messages.length" class="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
        <div class="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
          <svg class="w-7 h-7 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.636-6.364l.707.707M12 21a9 9 0 110-18 9 9 0 010 18z"/>
          </svg>
        </div>
        <div>
          <p class="font-semibold text-gray-700 dark:text-gray-300">{{ t('adminChat.emptyTitle') }}</p>
          <p class="text-sm text-gray-400 dark:text-gray-600 mt-1 max-w-sm">{{ t('adminChat.emptySubtitle') }}</p>
        </div>
        <!-- Suggested questions -->
        <div class="flex flex-wrap justify-center gap-2 mt-2">
          <button v-for="q in suggestedQuestions" :key="q"
            @click="input = q; send()"
            class="text-xs px-3 py-1.5 rounded-full border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors">
            {{ q }}
          </button>
        </div>
      </div>

      <!-- Message list -->
      <template v-else>
        <div v-for="(msg, i) in messages" :key="i"
          :class="['flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start']">

          <!-- AI avatar -->
          <div v-if="msg.role === 'assistant'"
            class="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center shrink-0 mt-0.5">
            <svg class="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.636-6.364l.707.707M12 21a9 9 0 110-18 9 9 0 010 18z"/>
            </svg>
          </div>

          <div :class="[
            'max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
            msg.role === 'user'
              ? 'bg-brand-600 text-white rounded-br-sm'
              : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-sm'
          ]">
            <span v-if="msg.role === 'user'">{{ msg.content }}</span>
            <div v-else>
              <div v-if="msg.content" class="chat-md" v-html="renderMarkdown(msg.content)" />
              <span v-else class="flex gap-1 items-center py-0.5">
                <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay:0ms"/>
                <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay:150ms"/>
                <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay:300ms"/>
              </span>
            </div>
          </div>

          <!-- User avatar -->
          <div v-if="msg.role === 'user'"
            class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
            <svg class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
        </div>
      </template>
    </div>

    <!-- ── Error ─────────────────────────────────────────────────────────────── -->
    <div v-if="chatErr" class="shrink-0 mx-6 mb-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
      {{ chatErr }}
    </div>

    <!-- ── Input bar ─────────────────────────────────────────────────────────── -->
    <div class="shrink-0 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div class="flex gap-3 items-end">
        <textarea
          v-model="input"
          @keydown="handleKey"
          :placeholder="t('adminChat.placeholder')"
          :disabled="loading"
          rows="1"
          class="input flex-1 resize-none leading-relaxed py-2.5 max-h-32"
        />
        <button @click="send" :disabled="loading || !input.trim()"
          class="btn-primary p-2.5 shrink-0 rounded-xl">
          <svg v-if="loading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        </button>
      </div>
      <p class="text-xs text-gray-400 dark:text-gray-600 mt-1.5">{{ t('adminChat.hint') }}</p>
    </div>
  </div>
</template>

<style scoped>
.chat-md :deep(h2), .chat-md :deep(h3) { @apply font-semibold mt-2 mb-1 text-sm; }
.chat-md :deep(ul)  { @apply list-disc list-inside space-y-0.5 my-1 text-sm; }
.chat-md :deep(ol)  { @apply list-decimal list-inside space-y-0.5 my-1 text-sm; }
.chat-md :deep(li)  { @apply text-sm; }
.chat-md :deep(p)   { @apply my-1 text-sm leading-relaxed; }
.chat-md :deep(strong) { @apply font-semibold; }
.chat-md :deep(em)  { @apply italic; }
.chat-md :deep(code) { @apply bg-black/10 dark:bg-white/10 px-1 rounded text-xs font-mono; }
.chat-md :deep(hr)  { @apply border-current opacity-20 my-2; }
.chat-md :deep(table) { @apply w-full text-xs border-collapse my-2; }
.chat-md :deep(th)  { @apply font-semibold px-2 py-1 border border-current opacity-80 bg-black/5; }
.chat-md :deep(td)  { @apply px-2 py-1 border border-current opacity-70; }
</style>
