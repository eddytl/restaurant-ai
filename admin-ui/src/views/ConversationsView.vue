<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/composables/useApi'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import ToastNotif from '@/components/ui/ToastNotif.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import ConvMessageBubble from '@/components/ui/ConvMessageBubble.vue'

const { t } = useI18n()

const conversations = ref([])
const loading = ref(true)
const page  = ref(1)
const limit = ref(20)
const total = ref(0)

const toast = ref(null)
const confirm = ref({ open: false, loading: false, conv: null })

// Detail panel
const selected   = ref(null)   // conversation from list (for title / meta)
const detail     = ref(null)   // full conversation loaded from API
const detailLoading = ref(false)
const panelOpen  = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await api.getConversations({ page: page.value, limit: limit.value })
    conversations.value = res.data || []
    total.value = res.total || conversations.value.length
  } finally { loading.value = false }
}
onMounted(load)

async function openDetail(c) {
  selected.value = c
  panelOpen.value = true
  detail.value = null
  detailLoading.value = true
  try {
    const res = await api.getConversation(c.sessionId)
    detail.value = res.data
  } catch(e) {
    toast.value?.add(e.message, 'error')
  } finally { detailLoading.value = false }
}

function closePanel() {
  panelOpen.value = false
  selected.value = null
  detail.value = null
}

function askDelete(c, e) {
  e?.stopPropagation()
  confirm.value = { open: true, loading: false, conv: c }
}

async function doDelete() {
  confirm.value.loading = true
  try {
    await api.deleteConversation(confirm.value.conv.sessionId)
    conversations.value = conversations.value.filter(x => x.sessionId !== confirm.value.conv.sessionId)
    total.value--
    if (selected.value?.sessionId === confirm.value.conv.sessionId) closePanel()
    toast.value?.add('Conversation supprimée.', 'success')
  } catch(e) {
    toast.value?.add(e.message, 'error')
  } finally {
    confirm.value = { open: false, loading: false, conv: null }
  }
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtTime(d) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ total }} conversation{{ total !== 1 ? 's' : '' }}</p>
    </div>

    <div class="card overflow-hidden">
      <!-- Loading skeleton -->
      <div v-if="loading" class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="th">{{ $t('nav.conversations') }}</th>
              <th class="th">{{ $t('conversations.session') }}</th>
              <th class="th">{{ $t('conversations.messages') }}</th>
              <th class="th">{{ $t('conversations.createdAt') }}</th>
              <th class="th">{{ $t('conversations.updatedAt') }}</th>
              <th class="th"></th>
            </tr>
          </thead>
          <SkeletonRows :rows="6" :has-avatar="true"
            :cols="['w-1/3', 'w-1/8', 'w-12', 'w-1/5', 'w-1/5', 'w-12']" />
        </table>
      </div>

      <!-- Table -->
      <div v-else-if="conversations.length" class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="th">{{ $t('nav.conversations') }}</th>
              <th class="th">{{ $t('conversations.session') }}</th>
              <th class="th">{{ $t('conversations.messages') }}</th>
              <th class="th">{{ $t('conversations.createdAt') }}</th>
              <th class="th">{{ $t('conversations.updatedAt') }}</th>
              <th class="th"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
            <tr v-for="c in conversations" :key="c.sessionId"
              @click="openDetail(c)"
              :class="['hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer',
                selected?.sessionId === c.sessionId ? 'bg-brand-50/50 dark:bg-brand-900/10' : '']">
              <td class="td">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                    </svg>
                  </div>
                  <span class="font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate">{{ c.title || 'Sans titre' }}</span>
                </div>
              </td>
              <td class="td">
                <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">
                  {{ c.sessionId?.slice(0, 8) }}…
                </code>
              </td>
              <td class="td text-center">
                <span class="font-semibold text-gray-900 dark:text-gray-100">{{ c.uiMessages?.length || 0 }}</span>
              </td>
              <td class="td text-xs text-gray-400">{{ fmtDate(c.createdAt) }}</td>
              <td class="td text-xs text-gray-400">{{ fmtDate(c.updatedAt) }}</td>
              <td class="td">
                <button @click="askDelete(c, $event)"
                  class="text-xs px-2 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  {{ $t('common.delete') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-center text-gray-400 py-12 text-sm">{{ $t('conversations.noData') }}</p>

      <PaginationBar
        :page="page" :limit="limit" :total="total"
        @update:page="p => { page = p; load() }"
        @update:limit="l => { limit = l; page = 1; load() }"
      />
    </div>

    <!-- Slide-over detail panel -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="panelOpen" class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" @click="closePanel" />
      </Transition>

      <Transition
        enter-active-class="transition-transform duration-250 ease-out"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition-transform duration-200 ease-in"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <div v-if="panelOpen"
          class="fixed right-0 top-0 h-full w-full max-w-lg z-50 flex flex-col bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800">

          <!-- Panel header -->
          <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-3 shrink-0">
            <div class="min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-7 h-7 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center shrink-0">
                  <svg class="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                  </svg>
                </div>
                <h3 class="font-semibold text-gray-900 dark:text-gray-100 truncate">{{ selected?.title || 'Sans titre' }}</h3>
              </div>
              <div class="flex items-center gap-3 text-xs text-gray-400">
                <code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{{ selected?.sessionId?.slice(0, 12) }}…</code>
                <span>{{ detail?.uiMessages?.length || selected?.uiMessages?.length || 0 }} messages</span>
                <span>{{ fmtDate(selected?.createdAt) }}</span>
              </div>
            </div>
            <button @click="closePanel"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Messages -->
          <div class="flex-1 overflow-y-auto p-4 space-y-3">

            <!-- Loading -->
            <template v-if="detailLoading">
              <div v-for="i in 5" :key="i" :class="['flex gap-2', i % 2 === 0 ? 'justify-end' : 'justify-start']">
                <div v-if="i % 2 !== 0" class="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0 mt-1" />
                <div :class="['h-12 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse', i % 2 === 0 ? 'w-2/3' : 'w-3/4']" />
                <div v-if="i % 2 === 0" class="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0 mt-1" />
              </div>
            </template>

            <!-- Empty -->
            <div v-else-if="!detail?.uiMessages?.length"
              class="flex flex-col items-center justify-center h-full text-center text-gray-400 py-16">
              <svg class="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              <p class="text-sm">Aucun message</p>
            </div>

            <!-- Chat bubbles -->
            <template v-else>
              <div v-for="msg in detail.uiMessages" :key="msg.id || msg.timestamp"
                :class="['flex gap-2 items-end', msg.role === 'user' ? 'justify-end' : 'justify-start']">

                <!-- Agent avatar -->
                <div v-if="msg.role === 'assistant'"
                  class="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center shrink-0 mb-0.5">
                  <svg width="14" height="14" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="14" cy="17" rx="8" ry="3" fill="white" opacity="0.2"/>
                    <ellipse cx="14" cy="17" rx="8" ry="3" fill="none" stroke="white" stroke-width="1.2" opacity="0.9"/>
                    <path d="M6 17 Q6 10 14 10 Q22 10 22 17" fill="white" opacity="0.22"/>
                    <path d="M6 17 Q6 10 14 10 Q22 10 22 17" fill="none" stroke="white" stroke-width="1.2" opacity="0.9"/>
                    <path d="M11 8.5 Q10.5 7 11 5.5" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
                    <path d="M14 8 Q13.5 6.5 14 5" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
                    <path d="M17 8.5 Q16.5 7 17 5.5" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
                  </svg>
                </div>

                <!-- Bubble -->
                <div :class="['group', msg.role === 'user' ? 'max-w-[75%]' : 'max-w-[85%]']">
                  <div :class="['px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words',
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white rounded-br-sm'
                      : msg.isError
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-bl-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm']">
                    <ConvMessageBubble v-if="msg.role === 'assistant'" :message="msg" />
                    <span v-else>{{ msg.content }}</span>
                  </div>
                  <p :class="['text-xs text-gray-400 mt-0.5 px-1',
                    msg.role === 'user' ? 'text-right' : 'text-left']">
                    {{ fmtTime(msg.timestamp) }}
                  </p>
                </div>

                <!-- User avatar -->
                <div v-if="msg.role === 'user'"
                  class="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center shrink-0 mb-0.5">
                  <svg class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
              </div>
            </template>
          </div>

          <!-- Panel footer -->
          <div class="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
            <p class="text-xs text-gray-400">
              {{ $t('conversations.updatedAt') }} : {{ fmtDate(selected?.updatedAt) }}
            </p>
            <button @click="askDelete(selected)"
              class="text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium">
              {{ $t('common.delete') }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmModal
      :open="confirm.open"
      :loading="confirm.loading"
      :title="$t('conversations.deleteConfirm')"
      :message="confirm.conv ? `« ${confirm.conv.title || 'Sans titre'} » sera définitivement supprimée.` : ''"
      :confirm-label="$t('common.delete')"
      @confirm="doDelete"
      @cancel="confirm.open = false"
    />

    <ToastNotif ref="toast" />
  </div>
</template>
