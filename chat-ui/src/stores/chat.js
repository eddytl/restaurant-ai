import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [],
    sessionId: null,
    isLoading: false,
    error: null,
    streamingMessage: null,
    conversationHistory: []
  }),

  getters: {
    hasMessages: (state) => state.messages.length > 0 || state.streamingMessage !== null,
    lastMessage: (state) => state.messages[state.messages.length - 1] || null
  },

  actions: {
    async fetchConversations() {
      try {
        const res = await fetch('/api/conversations');
        if (!res.ok) return;
        const { success, data } = await res.json();
        if (success && Array.isArray(data)) {
          this.conversationHistory = data.map((c) => ({
            id: c.sessionId,
            title: c.title,
            timestamp: new Date(c.updatedAt)
          }));
        }
      } catch {}
    },

    async loadConversation(sessionId) {
      if (this.isLoading || this.sessionId === sessionId) return;
      try {
        const res = await fetch(`/api/conversations/${sessionId}`);
        if (!res.ok) return;
        const { success, data } = await res.json();
        if (success && data) {
          this.messages = (data.uiMessages || []).map((m) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          this.sessionId = sessionId;
          this.streamingMessage = null;
        }
      } catch {}
    },

    async sendMessage(content) {
      if (!content.trim() || this.isLoading) return;

      this.error = null;
      this.isLoading = true;
      this.streamingMessage = null;

      const trimmedContent = content.trim();

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
          body: JSON.stringify({ message: trimmedContent, sessionId: this.sessionId })
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
                // Optimistically add to sidebar; will be confirmed on fetchConversations
                this.conversationHistory.unshift({
                  id: evt.sessionId,
                  title: trimmedContent.length > 50 ? trimmedContent.substring(0, 50) + '...' : trimmedContent,
                  timestamp: new Date()
                });
              }
            } else if (evt.type === 'token') {
              this.streamingMessage.content += evt.text;
            } else if (evt.type === 'done') {
              this.messages.push({ ...this.streamingMessage });
              this.streamingMessage = null;
              // Refresh sidebar to pick up any DB title updates
              this.fetchConversations();
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
      this.conversationHistory = this.conversationHistory.filter(c => c.id !== sessionId);
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
      if (conv) conv.title = trimmed;
    },

    // Start a new chat without deleting the current conversation from DB
    newConversation() {
      this.messages = [];
      this.sessionId = null;
      this.error = null;
      this.isLoading = false;
      this.streamingMessage = null;
    },

    // Permanently delete the current conversation from DB and clear local state
    async clearConversation() {
      if (this.sessionId) {
        try { await fetch(`/api/chat/${this.sessionId}`, { method: 'DELETE' }); } catch {}
        this.conversationHistory = this.conversationHistory.filter(c => c.id !== this.sessionId);
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
