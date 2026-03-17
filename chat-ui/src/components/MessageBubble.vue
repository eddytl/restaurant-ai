<template>
  <div
    class="flex items-start gap-2.5 px-6 max-w-[800px] mx-auto w-full py-1.5"
    :class="message.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
  >
    <!-- Assistant avatar -->
    <div
      v-if="message.role === 'assistant'"
      class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 bg-tc-accent shadow-[0_2px_8px_var(--shadow-accent)]"
    >
      <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="14" fill="#8b1a1a"/>
        <text x="14" y="19" text-anchor="middle" fill="white" font-size="13" font-weight="bold" font-family="serif">Y</text>
      </svg>
    </div>

    <!-- Message content -->
    <div class="flex flex-col max-w-[calc(100%-88px)]" :class="message.role === 'user' ? 'items-end' : 'items-start'">
      <div
        class="px-3.5 py-2.5 rounded-[14px] text-[14px] leading-[1.65] break-words"
        :class="[
          message.role === 'user'
            ? 'bg-tc-surface text-tc-text rounded-br-[4px]'
            : 'bg-transparent text-tc-text px-1',
          message.isError
            ? '!bg-tc-bg-error border border-tc-err-border !text-tc-err-text'
            : ''
        ]"
      >
        <div class="bubble-text" v-html="formattedContent" />
        <span v-if="isStreaming && message.content" class="inline-block w-0.5 h-[1em] bg-tc-accent align-text-bottom ml-0.5 animate-blink" />
      </div>
      <div class="flex items-center gap-2 mt-1 px-1">
        <span class="text-[11px] text-tc-faint">{{ formattedTime }}</span>
      </div>
    </div>

    <!-- User avatar -->
    <div
      v-if="message.role === 'user'"
      class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 bg-tc-surface border border-tc-border-h"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="4" fill="var(--text-secondary)"/>
        <path d="M1 17c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="var(--text-secondary)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue';

const props = defineProps({
  message: { type: Object, required: true },
  isStreaming: { type: Boolean, default: false }
});

const formattedTime = (() => {
  const date = props.message.timestamp instanceof Date
    ? props.message.timestamp
    : new Date(props.message.timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
})();

// RAF-throttled render: parse at most once per animation frame
const formattedContent = ref('');
let renderRaf = null;

function scheduleRender() {
  if (renderRaf) return;
  renderRaf = requestAnimationFrame(() => {
    renderRaf = null;
    formattedContent.value = parseMarkdown(props.message.content || '');
  });
}

onUnmounted(() => { if (renderRaf) cancelAnimationFrame(renderRaf); });
watch(() => props.message.content, scheduleRender, { immediate: true });

function parseMarkdown(raw) {
  let text = raw;

  // Escape HTML
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Inline formatting
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
  text = text.replace(/(?<![*_])\*([^*\n]+?)\*(?![*_])/g, '<em>$1</em>');
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  const lines = text.split('\n');
  const processed = [];
  let inList = false, inOrderedList = false;
  let listItems = [], tableLines = [];

  const isTableRow = (l) => /^\s*\|.+\|\s*$/.test(l);
  const isSeparatorRow = (l) => /^\s*\|[\s\-:|]+\|\s*$/.test(l);

  function flushList() {
    if (inList && listItems.length) {
      processed.push('<ul>' + listItems.map(i => `<li>${i}</li>`).join('') + '</ul>');
      listItems = []; inList = false;
    }
    if (inOrderedList && listItems.length) {
      processed.push('<ol>' + listItems.map(i => `<li>${i}</li>`).join('') + '</ol>');
      listItems = []; inOrderedList = false;
    }
  }

  function parseRow(line) { return line.split('|').slice(1, -1).map(c => c.trim()); }

  function flushTable() {
    if (tableLines.length < 2) {
      tableLines.forEach(l => processed.push(`<p class="md-p">${l}</p>`));
      tableLines = []; return;
    }
    const nonSep = [], sepFound = { v: false };
    tableLines.forEach(l => { if (isSeparatorRow(l)) sepFound.v = true; else nonSep.push(l); });
    if (!sepFound.v || !nonSep.length) {
      tableLines.forEach(l => processed.push(`<p class="md-p">${l}</p>`));
      tableLines = []; return;
    }
    const headerCells = parseRow(nonSep[0]);
    let html = '<div class="md-table-wrapper"><table class="md-table"><thead><tr>';
    headerCells.forEach(c => { html += `<th>${c}</th>`; });
    html += '</tr></thead>';
    if (nonSep.length > 1) {
      html += '<tbody>';
      nonSep.slice(1).forEach(row => {
        html += '<tr>';
        parseRow(row).forEach(c => { html += `<td>${c}</td>`; });
        html += '</tr>';
      });
      html += '</tbody>';
    }
    html += '</table></div>';
    processed.push(html);
    tableLines = [];
  }

  for (const line of lines) {
    if (isTableRow(line)) { flushList(); tableLines.push(line); continue; }
    else if (tableLines.length) flushTable();

    if (line.match(/^### (.+)/)) { flushList(); processed.push(`<h3 class="md-h3">${line.replace(/^### /, '')}</h3>`); continue; }
    if (line.match(/^## (.+)/))  { flushList(); processed.push(`<h2 class="md-h2">${line.replace(/^## /, '')}</h2>`); continue; }
    if (line.match(/^# (.+)/))   { flushList(); processed.push(`<h1 class="md-h1">${line.replace(/^# /, '')}</h1>`); continue; }
    if (line.match(/^&gt;\s+(.+)/)) { flushList(); processed.push(`<blockquote class="md-blockquote">${line.replace(/^&gt;\s+/, '')}</blockquote>`); continue; }

    const uMatch = line.match(/^[-*•]\s+(.+)/);
    if (uMatch) { if (inOrderedList) flushList(); inList = true; listItems.push(uMatch[1]); continue; }

    const oMatch = line.match(/^\d+\.\s+(.+)/);
    if (oMatch) { if (inList) flushList(); inOrderedList = true; listItems.push(oMatch[1]); continue; }

    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) { flushList(); processed.push('<hr class="md-hr"/>'); continue; }
    if (line.trim() === '') { flushList(); processed.push('<div class="line-break"></div>'); continue; }

    flushList();
    processed.push(`<p class="md-p">${line}</p>`);
  }

  flushList();
  if (tableLines.length) flushTable();
  return processed.join('');
}
</script>

<style scoped>
/* Markdown deep styles — use @apply so Tailwind tokens remain the source of truth */
.bubble-text :deep(.md-p)        { @apply m-0 p-0; }
.bubble-text :deep(.md-p + .md-p){ @apply mt-2; }
.bubble-text :deep(.md-h1)       { @apply text-[18px] font-bold text-tc-text my-3; }
.bubble-text :deep(.md-h2)       { @apply text-base font-semibold text-tc-text mt-2.5 mb-1 border-b border-tc-border pb-1; }
.bubble-text :deep(.md-h3)       { @apply text-[14px] font-semibold text-tc-text-2 my-2 uppercase tracking-wider; }
.bubble-text :deep(ul), .bubble-text :deep(ol) { @apply pl-5 my-1.5; }
.bubble-text :deep(li)           { @apply my-0.5 leading-relaxed; }
.bubble-text :deep(.inline-code) { @apply bg-tc-code-bg px-1.5 py-px rounded font-mono text-[12px] text-tc-code-text; }
.bubble-text :deep(.md-hr)       { @apply border-none border-t border-tc-border my-2.5; }
.bubble-text :deep(.line-break)  { @apply h-1.5; }
.bubble-text :deep(strong)       { @apply font-semibold text-tc-text; }
.bubble-text :deep(em)           { @apply italic text-tc-text-2; }
.bubble-text :deep(del)          { @apply line-through text-tc-muted; }
.bubble-text :deep(.md-blockquote) {
  @apply border-l-[3px] border-tc-accent pl-3 my-1.5 text-tc-text-2 italic;
}
.bubble-text :deep(.md-table-wrapper) {
  @apply overflow-x-auto my-2.5 rounded-lg border border-tc-border;
}
.bubble-text :deep(.md-table) {
  @apply w-full border-collapse text-[13px] min-w-[300px];
}
.bubble-text :deep(.md-table th) {
  @apply bg-tc-table-header text-tc-text font-semibold px-3 py-2 text-left border-b border-tc-border-h whitespace-nowrap;
}
.bubble-text :deep(.md-table td) {
  @apply px-3 py-[7px] text-tc-text-2 border-b border-tc-border;
}
.bubble-text :deep(.md-table tbody tr:last-child td) {
  @apply border-b-0;
}
.bubble-text :deep(.md-table tbody tr:hover td) {
  @apply bg-tc-table-hover text-tc-text;
}
</style>
