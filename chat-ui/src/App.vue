<template>
  <div id="app-root" :class="themeStore.isDark ? 'dark' : 'light'">
    <ChatInterface />
  </div>
</template>

<script setup>
import { useThemeStore } from './stores/theme';
import ChatInterface from './components/ChatInterface.vue';
const themeStore = useThemeStore();
</script>

<style>
/* ── CSS variables: dark (default) ── */
html.dark, .dark {
  --bg: #1a1a1a;
  --bg-sidebar: #111111;
  --bg-surface: #2a2a2a;
  --bg-surface-hover: #333333;
  --bg-input: #111111;
  --bg-suggestion: #111111;
  --bg-table-header: #111111;
  --bg-table-row-hover: #1f1f1f;
  --bg-error: #2a1515;
  --text: #e8e8e8;
  --text-secondary: #a0a0a0;
  --text-muted: #666666;
  --text-very-muted: #444444;
  --border: #2a2a2a;
  --border-hover: #3d3d3d;
  --accent: #8b1a1a;
  --accent-hover: #a01f1f;
  --code-bg: #2a2a2a;
  --code-text: #e88080;
  --error-border: #8b1a1a;
  --error-text: #e88080;
  --shadow-accent: rgba(139,26,26,0.3);
  --shadow-logo: rgba(139,26,26,0.4);
  --scrollbar-thumb: #3d3d3d;
  --scrollbar-hover: #555555;
}

/* ── CSS variables: light ── */
html.light, .light {
  --bg: #f0f0f8;
  --bg-sidebar: #ffffff;
  --bg-surface: #e2e2f0;
  --bg-surface-hover: #cecee0;
  --bg-input: #ffffff;
  --bg-suggestion: #ffffff;
  --bg-table-header: #ededfa;
  --bg-table-row-hover: #e8e8f8;
  --bg-error: #fff0f0;
  --text: #1a1a2e;
  --text-secondary: #3a3a5c;
  --text-muted: #60607a;
  --text-very-muted: #9898b8;
  --border: #d0d0e4;
  --border-hover: #b0b0cc;
  --accent: #8b1a1a;
  --accent-hover: #a01f1f;
  --code-bg: #e2e2f0;
  --code-text: #b91c1c;
  --error-border: #8b1a1a;
  --error-text: #b91c1c;
  --shadow-accent: rgba(139,26,26,0.18);
  --shadow-logo: rgba(139,26,26,0.22);
  --scrollbar-thumb: #c0c0d8;
  --scrollbar-hover: #a0a0c0;
}

html, body, #app, #app-root {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

#app-root {
  background: var(--bg);
  color: var(--text);
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  transition: background 0.2s, color 0.2s;
}
</style>
