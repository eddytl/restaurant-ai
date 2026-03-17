<template>
  <div class="flex h-screen w-screen overflow-hidden bg-tc-bg">

    <!-- ── Sidebar ── -->
    <aside
      class="bg-tc-sidebar flex flex-col z-[100] overflow-hidden sidebar-transition border-r border-tc-border"
      :class="[
        'max-md:fixed max-md:left-0 max-md:top-0 max-md:h-screen max-md:w-[260px] max-md:min-w-[260px]',
        mobileOpen ? 'max-md:translate-x-0 max-md:shadow-[4px_0_24px_rgba(0,0,0,0.4)]' : 'max-md:-translate-x-full',
        sidebarVisible ? 'md:w-[260px] md:min-w-[260px]' : 'md:w-[60px] md:min-w-[60px]'
      ]"
    >
      <!-- Header -->
      <div
        class="pt-4 pb-3 border-b border-tc-border flex items-center flex-shrink-0 sidebar-transition"
        :class="sidebarVisible ? 'px-3 justify-between' : 'px-0 justify-center'"
      >
        <!-- Brand (expanded only) -->
        <div v-if="sidebarVisible" class="flex items-center gap-2.5 overflow-hidden">
          <div class="flex-shrink-0">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="14" fill="#8b1a1a"/>
              <text x="14" y="19" text-anchor="middle" fill="white" font-size="14" font-weight="bold">T</text>
            </svg>
          </div>
          <div class="flex flex-col overflow-hidden">
            <span class="text-[15px] font-bold text-tc-text tracking-wide whitespace-nowrap">Restaurant</span>
            <span class="text-[11px] text-tc-muted uppercase tracking-widest whitespace-nowrap">AI Assistant</span>
          </div>
        </div>
        <!-- Expand button (collapsed, desktop only) -->
        <button
          v-else
          class="hidden md:flex bg-transparent border-none text-tc-muted cursor-pointer p-1 rounded-md items-center hover:text-tc-text hover:bg-tc-surface transition-colors"
          @click="toggleSidebar"
          title="Open sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </button>
        <!-- Collapse button (desktop, expanded only) -->
        <button
          v-if="sidebarVisible"
          class="hidden md:flex flex-shrink-0 bg-transparent border-none text-tc-muted cursor-pointer p-1 rounded-md items-center hover:text-tc-text hover:bg-tc-surface transition-colors"
          @click="toggleSidebar"
          title="Close sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </button>
      </div>

      <!-- New conversation -->
      <div class="flex-shrink-0" :class="sidebarVisible ? 'px-3 py-3' : 'px-0 py-3 flex justify-center'">
        <button
          v-if="sidebarVisible"
          class="w-full px-3.5 py-2.5 bg-tc-surface border border-tc-border rounded-lg text-tc-text text-[13px] font-medium cursor-pointer flex items-center gap-2 hover:bg-tc-hover hover:border-tc-border-h transition-colors whitespace-nowrap"
          @click="startNewConversation"
          title="New conversation"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
          </svg>
          New conversation
        </button>
        <button
          v-else
          class="w-9 h-9 bg-tc-surface border border-tc-border rounded-lg text-tc-text cursor-pointer flex items-center justify-center hover:bg-tc-hover hover:border-tc-border-h transition-colors"
          @click="startNewConversation"
          title="New conversation"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
          </svg>
        </button>
      </div>

      <!-- Conversation list (expanded only) -->
      <div v-if="sidebarVisible" class="flex-1 overflow-y-auto py-2">
        <div class="text-[11px] font-semibold text-tc-muted uppercase tracking-widest px-4 py-2 whitespace-nowrap">Recent</div>
        <div class="flex flex-col gap-px">
          <div v-if="chatStore.conversationHistory.length === 0" class="px-4 py-3 text-[13px] text-tc-muted italic">
            No conversations yet
          </div>
          <div
            v-for="conv in chatStore.conversationHistory"
            :key="conv.id"
            class="group flex items-center gap-1.5 py-2 pr-2 pl-4 cursor-pointer rounded-md mx-2 transition-colors overflow-hidden"
            :class="conv.id === chatStore.sessionId
              ? 'bg-tc-surface text-tc-text'
              : 'text-tc-text-2 hover:bg-tc-surface hover:text-tc-text'"
            @click="openConversation(conv.id)"
          >
            <input
              v-if="renamingId === conv.id"
              class="flex-1 min-w-0 bg-tc-input border border-tc-accent rounded text-tc-text text-[13px] px-1.5 py-0.5 outline-none"
              v-model="renameValue"
              @keydown.enter.prevent="submitRename(conv.id)"
              @keydown.escape="renamingId = null"
              @blur="submitRename(conv.id)"
              @click.stop
              ref="renameInputRef"
            />
            <span v-else class="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px]">{{ conv.title }}</span>
            <button
              v-if="renamingId !== conv.id"
              class="flex-shrink-0 bg-transparent border-none cursor-pointer text-tc-muted p-0.5 px-1 rounded flex items-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-tc-text hover:bg-tc-hover"
              @click.stop="openContextMenu($event, conv.id)"
              title="More options"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      <!-- Spacer when collapsed -->
      <div v-else class="flex-1" />

      <!-- Footer -->
      <div
        class="py-3 border-t border-tc-border flex flex-col gap-3 flex-shrink-0 sidebar-transition"
        :class="sidebarVisible ? 'px-4' : 'px-0 items-center'"
      >
        <!-- Theme toggle -->
        <button
          v-if="sidebarVisible"
          class="flex items-center gap-2 px-2.5 py-2 bg-transparent border border-tc-border rounded-lg text-tc-text-2 text-[13px] cursor-pointer w-full hover:bg-tc-surface hover:text-tc-text transition-colors whitespace-nowrap"
          @click="themeStore.toggle()"
          :title="themeStore.isDark ? 'Light mode' : 'Dark mode'"
        >
          <svg v-if="themeStore.isDark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <span>{{ themeStore.isDark ? 'Light mode' : 'Dark mode' }}</span>
        </button>
        <button
          v-else
          class="w-9 h-9 bg-transparent border-none text-tc-muted cursor-pointer flex items-center justify-center rounded-lg hover:bg-tc-surface hover:text-tc-text transition-colors"
          @click="themeStore.toggle()"
          :title="themeStore.isDark ? 'Light mode' : 'Dark mode'"
        >
          <svg v-if="themeStore.isDark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>

      </div>
    </aside>

    <!-- Mobile overlay -->
    <div
      v-if="mobileOpen"
      class="md:hidden fixed inset-0 bg-black/50 z-[99]"
      @click="mobileOpen = false"
    />

    <!-- ── Main ── -->
    <main class="flex-1 flex flex-col overflow-hidden min-w-0 bg-tc-bg">

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto" ref="messagesContainer">

        <!-- Welcome screen -->
        <div v-if="!chatStore.hasMessages" class="flex items-center justify-center min-h-full p-10">
          <div class="max-w-[640px] w-full text-center">
            <div class="mb-6 flex justify-center">
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style="filter: drop-shadow(0 4px 24px var(--shadow-logo))">
                <circle cx="36" cy="36" r="36" fill="#8b1a1a"/>
                <circle cx="36" cy="36" r="30" fill="#6b1414" opacity="0.5"/>
                <text x="36" y="48" text-anchor="middle" fill="white" font-size="32" font-weight="bold" font-family="serif">T</text>
              </svg>
            </div>
            <h1 class="text-[28px] font-bold text-tc-text mb-3 tracking-tight">Bienvenue chez Restaurant</h1>
            <p class="text-[15px] text-tc-text-2 leading-relaxed mb-9">
              Your AI assistant for Restaurant restaurant.<br/>
              Browse our menu, place orders, or check your order status.
            </p>
            <div class="grid grid-cols-2 gap-2.5 md:grid-cols-2 sm:grid-cols-1">
              <button
                v-for="s in suggestions" :key="s.text"
                class="bg-tc-suggestion border border-tc-border rounded-xl p-3.5 text-tc-text cursor-pointer flex items-center gap-2.5 text-left text-[13px] font-medium hover:bg-tc-surface hover:border-tc-border-h hover:-translate-y-px active:translate-y-0 transition-all"
                @click="sendSuggestion(s.text)"
              >
                <span class="text-[18px] flex-shrink-0">{{ s.icon }}</span>
                <span class="leading-snug">{{ s.text }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Messages list -->
        <div v-else class="pt-6 pb-4 flex flex-col gap-1">
          <MessageBubble v-for="msg in chatStore.messages" :key="msg.id" :message="msg" />

          <MessageBubble
            v-if="chatStore.streamingMessage && chatStore.streamingMessage.content"
            key="streaming"
            :message="chatStore.streamingMessage"
            :is-streaming="true"
          />

          <!-- Loading dots -->
          <div
            v-if="chatStore.isLoading && (!chatStore.streamingMessage || !chatStore.streamingMessage.content)"
            class="flex items-start gap-3 px-6 max-w-[800px] mx-auto w-full"
          >
            <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 bg-[#8b1a1a]">
              <svg width="20" height="20" viewBox="0 0 28 28">
                <circle cx="14" cy="14" r="14" fill="#8b1a1a"/>
                <text x="14" y="19" text-anchor="middle" fill="white" font-size="12" font-weight="bold">Y</text>
              </svg>
            </div>
            <div class="flex gap-[5px] items-center p-3">
              <span class="w-2 h-2 bg-tc-muted rounded-full animate-bounce-dot" />
              <span class="w-2 h-2 bg-tc-muted rounded-full animate-bounce-dot [animation-delay:0.2s]" />
              <span class="w-2 h-2 bg-tc-muted rounded-full animate-bounce-dot [animation-delay:0.4s]" />
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="px-5 pb-5 pt-3 bg-tc-bg flex-shrink-0">
        <div class="max-w-[768px] mx-auto">
          <div class="flex items-end gap-2 bg-tc-input border-[1.5px] border-tc-border rounded-[14px] px-4 py-2.5 focus-within:border-tc-accent transition-colors">
            <textarea
              ref="textareaRef"
              v-model="inputMessage"
              placeholder="Message Yamo, your Restaurant AI assistant..."
              class="flex-1 bg-transparent border-none outline-none text-tc-text text-[14px] leading-relaxed resize-none min-h-6 max-h-[200px] placeholder:text-tc-faint disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="chatStore.isLoading"
              @keydown="handleKeydown"
              @input="autoResize"
              rows="1"
            />
            <button
              class="w-[34px] h-[34px] rounded-lg border-none cursor-pointer flex items-center justify-center flex-shrink-0 transition-all duration-150"
              :class="inputMessage.trim() && !chatStore.isLoading
                ? 'bg-tc-accent text-white hover:bg-tc-accent-h hover:scale-105'
                : 'bg-tc-surface text-tc-muted cursor-not-allowed'"
              :disabled="!inputMessage.trim() || chatStore.isLoading"
              @click="sendMessage"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M.5 1.163A1 1 0 0 1 1.97.28l12.868 6.837a1 1 0 0 1 0 1.766L1.969 15.72A1 1 0 0 1 .5 14.836V10.33a1 1 0 0 1 .816-.983L8.5 8 1.316 6.653A1 1 0 0 1 .5 5.67V1.163z"/>
              </svg>
            </button>
          </div>
          <div class="text-center text-[11px] text-tc-faint mt-2">
            Press <kbd class="bg-tc-surface border border-tc-border rounded px-[5px] py-px text-[10px] text-tc-text-2">Enter</kbd>
            to send,
            <kbd class="bg-tc-surface border border-tc-border rounded px-[5px] py-px text-[10px] text-tc-text-2">Shift+Enter</kbd>
            for new line
          </div>
        </div>
      </div>
    </main>

    <!-- ── Context menu ── -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="fixed z-[9999] rounded-xl p-1.5 min-w-[180px] animate-menu-in"
        :style="{
          top: contextMenu.y + 'px',
          left: contextMenu.x + 'px',
          background: 'var(--bg-sidebar)',
          border: '1px solid var(--border-hover)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 8px 32px rgba(0,0,0,0.18)',
        }"
        @click.stop
      >
        <button
          class="flex items-center gap-2.5 w-full py-2 px-3 bg-transparent border-none text-[13px] font-medium cursor-pointer rounded-lg text-left transition-colors"
          :style="{ color: 'var(--text)' }"
          @mouseenter="e => e.currentTarget.style.background = 'var(--bg-surface)'"
          @mouseleave="e => e.currentTarget.style.background = 'transparent'"
          @click="startRename(contextMenu.convId)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink:0">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Rename
        </button>
        <div class="my-1" :style="{ height: '1px', background: 'var(--border)' }" />
        <button
          class="flex items-center gap-2.5 w-full py-2 px-3 bg-transparent border-none text-[13px] font-medium cursor-pointer rounded-lg text-left transition-colors"
          style="color: #e05050"
          @mouseenter="e => e.currentTarget.style.background = 'var(--bg-error)'"
          @mouseleave="e => e.currentTarget.style.background = 'transparent'"
          @click="deleteConversation(contextMenu.convId)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink:0">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
          Delete
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useChatStore } from '../stores/chat';
import { useThemeStore } from '../stores/theme';
import MessageBubble from './MessageBubble.vue';

const chatStore = useChatStore();
const themeStore = useThemeStore();
const messagesContainer = ref(null);
const textareaRef = ref(null);
const inputMessage = ref('');
const renameInputRef = ref(null);
let scrollRaf = null;

// Sidebar
const sidebarVisible = ref(localStorage.getItem('tc-sidebar') !== 'closed');
const mobileOpen = ref(false);

function toggleSidebar() {
  if (window.innerWidth <= 768) {
    mobileOpen.value = !mobileOpen.value;
  } else {
    sidebarVisible.value = !sidebarVisible.value;
    localStorage.setItem('tc-sidebar', sidebarVisible.value ? 'open' : 'closed');
  }
}


// Context menu
const contextMenu = ref({ visible: false, convId: null, x: 0, y: 0 });

function openContextMenu(event, convId) {
  const rect = event.currentTarget.getBoundingClientRect();
  let x = rect.left;
  if (x + 168 > window.innerWidth) x = window.innerWidth - 178;
  contextMenu.value = { visible: true, convId, x, y: rect.bottom + 4 };
}

function closeContextMenu() { contextMenu.value.visible = false; }

// Rename
const renamingId = ref(null);
const renameValue = ref('');

function startRename(convId) {
  closeContextMenu();
  const conv = chatStore.conversationHistory.find(c => c.id === convId);
  if (!conv) return;
  renamingId.value = convId;
  renameValue.value = conv.title;
  nextTick(() => {
    const inputs = renameInputRef.value;
    const el = Array.isArray(inputs) ? inputs[0] : inputs;
    el?.focus(); el?.select();
  });
}

async function submitRename(convId) {
  if (renamingId.value !== convId) return;
  renamingId.value = null;
  await chatStore.renameConversation(convId, renameValue.value);
}

async function deleteConversation(convId) {
  closeContextMenu();
  await chatStore.deleteConversation(convId);
}

const suggestions = [
  { icon: '🍽️', text: 'Show me the full menu' },
  { icon: '🛒', text: 'I want to place an order' },
  { icon: '📦', text: 'Check my order status' },
  { icon: '🔥', text: 'What are the menu specials?' },
  { icon: '🍗', text: 'Show me the chicken dishes' },
  { icon: '🥗', text: 'What salads do you have?' }
];

function sendSuggestion(text) { inputMessage.value = text; sendMessage(); }

async function sendMessage() {
  const msg = inputMessage.value.trim();
  if (!msg || chatStore.isLoading) return;
  inputMessage.value = '';
  await nextTick(); resetTextarea();
  await chatStore.sendMessage(msg);
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function autoResize() {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

function resetTextarea() {
  const el = textareaRef.value;
  if (el) el.style.height = 'auto';
}

function scrollToBottom(smooth = true) {
  nextTick(() => {
    const c = messagesContainer.value;
    if (c) c.scrollTo({ top: c.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  });
}

function scrollToBottomStreaming() {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = null;
    const c = messagesContainer.value;
    if (c) c.scrollTop = c.scrollHeight;
  });
}

function startNewConversation() {
  chatStore.newConversation();
  mobileOpen.value = false;
  nextTick(() => textareaRef.value?.focus());
}

async function openConversation(sessionId) {
  await chatStore.loadConversation(sessionId);
  mobileOpen.value = false;
  nextTick(() => scrollToBottom(false));
}

onMounted(async () => {
  textareaRef.value?.focus();
  await chatStore.fetchConversations();
  document.addEventListener('click', closeContextMenu);
});

onUnmounted(() => {
  if (scrollRaf) cancelAnimationFrame(scrollRaf);
  document.removeEventListener('click', closeContextMenu);
});

watch(() => chatStore.messages.length, () => scrollToBottom());
watch(() => chatStore.isLoading, (v) => { if (v) scrollToBottom(); });
watch(() => chatStore.streamingMessage?.content, scrollToBottomStreaming);
</script>
