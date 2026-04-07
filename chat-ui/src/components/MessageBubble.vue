<template>
  <div
    class="flex items-start px-6 max-w-[800px] mx-auto w-full py-1.5"
    :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
  >
    <!-- Message content -->
    <div
      class="flex flex-col"
      :class="[
        message.role === 'user' ? 'items-end max-w-[75%]' : 'items-start w-full'
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
        <div ref="bubbleEl" class="bubble-text" v-html="formattedContent" />
        <span v-if="isStreaming && message.content" class="inline-block w-0.5 h-[1em] bg-tc-accent align-text-bottom ml-0.5 animate-blink" />
      </div>
      <div class="flex items-center gap-2 mt-1 px-1">
        <span class="text-[11px] text-tc-faint">{{ formattedTime }}</span>
        <button
          v-if="message.isError"
          @click="retry"
          class="text-[11px] text-tc-accent hover:underline flex items-center gap-1"
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/><path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/></svg>
          Réessayer
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue';
import { useChatStore } from '../stores/chat';
import { useLanguageStore } from '../stores/language';
import { parseMarkdown } from '../utils/markdown';

const props = defineProps({
  message: { type: Object, required: true },
  isStreaming: { type: Boolean, default: false }
});

const chatStore = useChatStore();
const langStore = useLanguageStore();
function retry() { chatStore.retryLastMessage(langStore.lang); }

// Module-level LRU cache: type:idx → imageUrl (persists across component instances, max 200 entries)
const IMAGE_CACHE_MAX = 200;
const imageCache = new Map();
function imageCacheSet(key, url) {
  if (imageCache.size >= IMAGE_CACHE_MAX) imageCache.delete(imageCache.keys().next().value);
  imageCache.set(key, url);
}

// Neutral gray placeholder — keeps card height stable before the real image loads
const PLACEHOLDER_SRC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 155 120'%3E%3Crect width='155' height='120' fill='%23e2e8f0'/%3E%3C/svg%3E";

const bubbleEl = ref(null);

async function resolveMenuImages() {
  await nextTick();
  if (!bubbleEl.value) return;
  const imgs = [...bubbleEl.value.querySelectorAll('img[data-image-idx]')];
  if (!imgs.length) return;

  await Promise.all(imgs.map(async (img) => {
    const type = img.dataset.imageType;
    const idx = img.dataset.imageIdx;
    const key = `${type}:${idx}`;

    // Synchronous cache hit — set immediately, no flicker on re-render
    if (imageCache.has(key)) {
      img.src = imageCache.get(key);
      return;
    }

    try {
      const res = await fetch(`/api/images/${type}/${idx}`);
      const { success, data } = await res.json();
      if (success && data?.url) {
        imageCacheSet(key, data.url);
        img.src = data.url;
      }
    } catch {}
  }));
}

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
    formattedContent.value = parseMarkdown(props.message.content || '', imageCache, PLACEHOLDER_SRC);
    resolveMenuImages();
  });
}

onUnmounted(() => { if (renderRaf) cancelAnimationFrame(renderRaf); });
watch(() => props.message.content, scheduleRender, { immediate: true });


</script>

<style scoped>
/* Markdown deep styles — use @apply so Tailwind tokens remain the source of truth */
.bubble-text :deep(.md-p)        { @apply m-0 p-0; }
.bubble-text :deep(.md-p + .md-p){ @apply mt-2; }
.bubble-text :deep(.md-h1)       { @apply text-[18px] font-bold text-tc-text my-3; }
.bubble-text :deep(.md-h2)       { @apply text-base font-semibold text-tc-text mt-2.5 mb-1 border-b border-tc-border pb-1; }
.bubble-text :deep(.md-h3)       { @apply text-[14px] font-semibold text-tc-text-2 my-2 uppercase tracking-wider; }
.bubble-text :deep(.md-h4)       { @apply text-[13px] font-semibold text-tc-text my-2; }
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
.bubble-text :deep(.img-loading) {
  @apply bg-tc-surface;
  animation: shimmer 1.4s ease-in-out infinite;
  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
  background-size: 200% 100%;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Menu card grid */
.bubble-text :deep(.menu-card-grid) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 165px));
  gap: 10px;
  margin: 10px 0;
  width: 100%;
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
