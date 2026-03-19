import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';

const CONV_LIST_KEY = 'restaurant-conv-list';
const convKey = (id) => `restaurant-conv-${id}`;

function readCache(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function writeCache(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function removeCache(key) {
  try { localStorage.removeItem(key); } catch {}
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [],
    sessionId: null,
    isLoading: false,
    error: null,
    streamingMessage: null,
    conversationHistory: [],
    lastUserMessage: '',
    customerProfile: (() => { try { return JSON.parse(localStorage.getItem('restaurant-customer')) || null; } catch { return null; } })()
  }),

  getters: {
    hasMessages: (state) => state.messages.length > 0 || state.streamingMessage !== null,
    lastMessage: (state) => state.messages[state.messages.length - 1] || null
  },

  actions: {
    async fetchConversations() {
      // 1. Load from cache immediately (instant render)
      const cached = readCache(CONV_LIST_KEY);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        this.conversationHistory = cached.map((c) => ({ ...c, timestamp: new Date(c.timestamp) }));
      }

      // 2. Fetch from API in background and update
      try {
        const res = await fetch('/api/conversations');
        if (!res.ok) return;
        const { success, data } = await res.json();
        if (success && Array.isArray(data)) {
          const list = data.map((c) => ({
            id: c.sessionId,
            title: c.title,
            timestamp: new Date(c.updatedAt)
          }));
          this.conversationHistory = list;
          writeCache(CONV_LIST_KEY, list);
        }
      } catch {}
    },

    async loadConversation(sessionId) {
      if (this.isLoading || this.sessionId === sessionId) return;

      // 1. Load from cache immediately
      const cached = readCache(convKey(sessionId));
      if (cached && Array.isArray(cached) && cached.length > 0) {
        this.messages = cached.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
        this.sessionId = sessionId;
        this.streamingMessage = null;
        return; // cache hit — skip API call
      }

      // 2. Cache miss — fetch from API
      try {
        const res = await fetch(`/api/conversations/${sessionId}`);
        if (!res.ok) return;
        const { success, data } = await res.json();
        if (success && data) {
          const msgs = (data.uiMessages || []).map((m) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          this.messages = msgs;
          this.sessionId = sessionId;
          this.streamingMessage = null;
          writeCache(convKey(sessionId), msgs);
        }
      } catch {}
    },

    async retryLastMessage(language = 'fr') {
      if (!this.lastUserMessage) return;
      // Remove the last error message before retrying
      const lastIdx = [...this.messages].reverse().findIndex(m => m.isError);
      if (lastIdx !== -1) this.messages.splice(this.messages.length - 1 - lastIdx, 1);
      await this.sendMessage(this.lastUserMessage, language);
    },

    async sendMessage(content, language = 'fr') {
      if (!content.trim() || this.isLoading) return;

      this.error = null;
      this.isLoading = true;
      this.streamingMessage = null;

      const trimmedContent = content.trim();
      this.lastUserMessage = trimmedContent;

      this.messages.push({
        id: uuidv4(),
        role: 'user',
        content: trimmedContent,
        timestamp: new Date()
      });

      this.streamingMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmedContent, sessionId: this.sessionId, language, customerProfile: this.customerProfile })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            let evt;
            try { evt = JSON.parse(line.slice(6)); } catch { continue; }

            if (evt.type === 'start') {
              const isNew = !this.sessionId;
              this.sessionId = evt.sessionId;
              if (isNew) {
                const entry = {
                  id: evt.sessionId,
                  title: trimmedContent.length > 50 ? trimmedContent.substring(0, 50) + '...' : trimmedContent,
                  timestamp: new Date()
                };
                this.conversationHistory.unshift(entry);
                writeCache(CONV_LIST_KEY, this.conversationHistory);
              }
            } else if (evt.type === 'token') {
              this.streamingMessage.content += evt.text;
            } else if (evt.type === 'done') {
              this.messages.push({ ...this.streamingMessage });
              this.streamingMessage = null;
              // Persist messages to cache
              writeCache(convKey(this.sessionId), this.messages);
              // Refresh sidebar (updates title from DB)
              this.fetchConversations();
            } else if (evt.type === 'customer_identified') {
              this.customerProfile = { name: evt.name, phone: evt.phone };
              localStorage.setItem('restaurant-customer', JSON.stringify(this.customerProfile));
            } else if (evt.type === 'error') {
              throw new Error(evt.message);
            }
          }
        }
      } catch (err) {
        this.messages.push({
          id: uuidv4(),
          role: 'assistant',
          content: err.message || 'Something went wrong. Please try again.',
          timestamp: new Date(),
          isError: true
        });
        this.streamingMessage = null;
      } finally {
        this.isLoading = false;
      }
    },

    async deleteConversation(sessionId) {
      try { await fetch(`/api/chat/${sessionId}`, { method: 'DELETE' }); } catch {}
      removeCache(convKey(sessionId));
      this.conversationHistory = this.conversationHistory.filter(c => c.id !== sessionId);
      writeCache(CONV_LIST_KEY, this.conversationHistory);
      if (this.sessionId === sessionId) {
        this.messages = [];
        this.sessionId = null;
        this.streamingMessage = null;
      }
    },

    async renameConversation(sessionId, newTitle) {
      const trimmed = newTitle.trim();
      if (!trimmed) return;
      try {
        await fetch(`/api/conversations/${sessionId}/rename`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: trimmed })
        });
      } catch {}
      const conv = this.conversationHistory.find(c => c.id === sessionId);
      if (conv) {
        conv.title = trimmed;
        writeCache(CONV_LIST_KEY, this.conversationHistory);
      }
    },

    newConversation() {
      this.messages = [];
      this.sessionId = null;
      this.error = null;
      this.isLoading = false;
      this.streamingMessage = null;
    },

    async clearConversation() {
      if (this.sessionId) {
        try { await fetch(`/api/chat/${this.sessionId}`, { method: 'DELETE' }); } catch {}
        removeCache(convKey(this.sessionId));
        this.conversationHistory = this.conversationHistory.filter(c => c.id !== this.sessionId);
        writeCache(CONV_LIST_KEY, this.conversationHistory);
      }
      this.messages = [];
      this.sessionId = null;
      this.error = null;
      this.isLoading = false;
      this.streamingMessage = null;
    },

    clearError() { this.error = null; }
  }
});
