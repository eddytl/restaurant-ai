<template>
  <div
    class="flex items-start px-6 max-w-[800px] mx-auto w-full py-1.5"
    :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
  >
    <!-- Message content -->
    <div
      class="flex flex-col"
      :class="[
        message.role === 'user' ? 'items-end max-w-[75%]' : 'items-start max-w-[90%]'
      ]"
    >
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

  // Images (before inline formatting to avoid escaping the URL)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const safeAlt = alt.replace(/"/g, '&quot;');
    const safeUrl = url.trim();
    return `<img class="md-img" src="${safeUrl}" alt="${safeAlt}" loading="lazy" />`;
  });

  // Inline formatting
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
  text = text.replace(/(?<![*_])\*([^*\n]+?)\*(?![*_])/g, '<em>$1</em>');
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  const lines = text.split('\n');
  const processed = [];
  let inList = false, inOrderedList = false;
  let listItems = [], tableLines = [], cardBuffer = [];

  const isTableRow = (l) => /^\s*\|.+\|\s*$/.test(l);
  const isSeparatorRow = (l) => /^\s*\|[\s\-:|]+\|\s*$/.test(l);
  const isImgLine = (l) => /<img[^>]+class="md-img"/.test(l);

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

  function formatCardInfo(desc, extra) {
    const priceMatch = desc.match(/(.+?)\s*[—–-]+\s*([0-9][0-9\s,.]*\s*XAF.*)$/i);
    if (priceMatch) {
      const name = priceMatch[1].replace(/<\/?strong>/g, '').trim();
      const price = priceMatch[2].trim();
      return `<div class="menu-card-info"><strong>${name}</strong>${extra ? `<span class="card-desc">${extra}</span>` : ''}<span class="card-price">${price}</span></div>`;
    }
    return `<div class="menu-card-info"><strong>${desc}</strong>${extra ? `<span class="card-desc">${extra}</span>` : ''}</div>`;
  }

  function flushCards() {
    if (!cardBuffer.length) return;
    const cards = cardBuffer.map(({ img, desc, extra }) =>
      `<div class="menu-card">${img}${desc ? formatCardInfo(desc, extra) : ''}</div>`
    ).join('');
    processed.push(`<div class="menu-card-grid">${cards}</div>`);
    cardBuffer = [];
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

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (isTableRow(line)) { flushList(); flushCards(); tableLines.push(line); i++; continue; }
    else if (tableLines.length) flushTable();

    // Menu card: image line, optional name/price line, optional description line
    if (isImgLine(line)) {
      flushList();
      const next = lines[i + 1] ?? '';
      const afterNext = lines[i + 2] ?? '';
      const hasDesc = next.trim() !== '' && !isImgLine(next);
      // Capture a third line as extra only if it's plain text (not a heading, not an image)
      const hasExtra = hasDesc && afterNext.trim() !== '' && !isImgLine(afterNext) && !afterNext.match(/^#{1,3} /);
      cardBuffer.push({ img: line, desc: hasDesc ? next : '', extra: hasExtra ? afterNext : '' });
      i += hasExtra ? 3 : (hasDesc ? 2 : 1);
      continue;
    }

    // Any non-card, non-blank line flushes the card buffer
    if (cardBuffer.length && line.trim() !== '') flushCards();

    if (line.match(/^### (.+)/)) { flushList(); processed.push(`<h3 class="md-h3">${line.replace(/^### /, '')}</h3>`); i++; continue; }
    if (line.match(/^## (.+)/))  { flushList(); processed.push(`<h2 class="md-h2">${line.replace(/^## /, '')}</h2>`); i++; continue; }
    if (line.match(/^# (.+)/))   { flushList(); processed.push(`<h1 class="md-h1">${line.replace(/^# /, '')}</h1>`); i++; continue; }
    if (line.match(/^&gt;\s+(.+)/)) { flushList(); processed.push(`<blockquote class="md-blockquote">${line.replace(/^&gt;\s+/, '')}</blockquote>`); i++; continue; }

    const uMatch = line.match(/^[-*•]\s+(.+)/);
    if (uMatch) { if (inOrderedList) flushList(); inList = true; listItems.push(uMatch[1]); i++; continue; }

    const oMatch = line.match(/^\d+\.\s+(.+)/);
    if (oMatch) { if (inList) flushList(); inOrderedList = true; listItems.push(oMatch[1]); i++; continue; }

    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) { flushList(); processed.push('<hr class="md-hr"/>'); i++; continue; }
    if (line.trim() === '') { flushList(); processed.push('<div class="line-break"></div>'); i++; continue; }

    flushList();
    processed.push(`<p class="md-p">${line}</p>`);
    i++;
  }

  flushList();
  flushCards();
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
.bubble-text :deep(.md-img) {
  @apply rounded-xl my-2 max-w-full object-cover;
  max-height: 220px;
  display: block;
}

/* Menu card grid */
.bubble-text :deep(.menu-card-grid) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 10px;
  margin: 10px 0;
}
.bubble-text :deep(.menu-card) {
  @apply rounded-2xl border border-tc-border overflow-hidden bg-tc-surface;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.15s;
}
.bubble-text :deep(.menu-card:hover) {
  @apply shadow-md border-tc-accent;
}
.bubble-text :deep(.menu-card .md-img) {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 0;
  margin: 0;
  max-height: none;
  display: block;
}
.bubble-text :deep(.menu-card-info) {
  @apply px-3 py-2 flex flex-col gap-0.5;
}
.bubble-text :deep(.menu-card-info strong) {
  @apply text-[13px] font-semibold text-tc-text leading-tight;
}
.bubble-text :deep(.menu-card-info .card-price) {
  @apply text-[12px] font-semibold text-tc-accent;
}
.bubble-text :deep(.menu-card-info .card-desc) {
  @apply text-[11px] text-tc-muted leading-snug;
}
</style>
