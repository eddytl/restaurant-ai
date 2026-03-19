<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { parseMarkdown } from '@/utils/markdown'

const props = defineProps({
  message: { type: Object, required: true },
})

const bubbleEl = ref(null)

// Module-level image cache shared across all instances
const IMAGE_CACHE_MAX = 200
const imageCache = new Map()
function imageCacheSet(key, url) {
  if (imageCache.size >= IMAGE_CACHE_MAX) imageCache.delete(imageCache.keys().next().value)
  imageCache.set(key, url)
}

const PLACEHOLDER_SRC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 155 120'%3E%3Crect width='155' height='120' fill='%23e2e8f0'/%3E%3C/svg%3E"

async function resolveMenuImages() {
  await nextTick()
  if (!bubbleEl.value) return
  const imgs = [...bubbleEl.value.querySelectorAll('img[data-image-idx]')]
  if (!imgs.length) return

  await Promise.all(imgs.map(async (img) => {
    const type = img.dataset.imageType
    const idx  = img.dataset.imageIdx
    const key  = `${type}:${idx}`
    if (imageCache.has(key)) { img.src = imageCache.get(key); return }
    try {
      const res = await fetch(`/api/images/${type}/${idx}`)
      const { success, data } = await res.json()
      if (success && data?.url) { imageCacheSet(key, data.url); img.src = data.url }
    } catch {}
  }))
}

const formattedContent = ref('')
let renderRaf = null

function scheduleRender() {
  if (renderRaf) return
  renderRaf = requestAnimationFrame(() => {
    renderRaf = null
    formattedContent.value = parseMarkdown(props.message.content || '', imageCache, PLACEHOLDER_SRC)
    resolveMenuImages()
  })
}

onUnmounted(() => { if (renderRaf) cancelAnimationFrame(renderRaf) })
watch(() => props.message.content, scheduleRender, { immediate: true })
</script>

<template>
  <div ref="bubbleEl" class="bubble-content" v-html="formattedContent" />
</template>

<style scoped>
.bubble-content :deep(.md-p)         { margin: 0; padding: 0; }
.bubble-content :deep(.md-p + .md-p) { margin-top: 0.375rem; }
.bubble-content :deep(.md-h1)        { font-size: 1.1rem; font-weight: 700; margin: 0.75rem 0; }
.bubble-content :deep(.md-h2)        { font-size: 0.95rem; font-weight: 600; margin: 0.5rem 0 0.25rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem; }
.bubble-content :deep(.md-h3)        { font-size: 0.8rem; font-weight: 600; margin: 0.5rem 0; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
.bubble-content :deep(ul), .bubble-content :deep(ol) { padding-left: 1.25rem; margin: 0.375rem 0; }
.bubble-content :deep(li)            { margin: 0.125rem 0; line-height: 1.6; }
.bubble-content :deep(.inline-code)  { background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-family: monospace; font-size: 0.75rem; color: #1e293b; }
.bubble-content :deep(.md-hr)        { border: none; border-top: 1px solid #e5e7eb; margin: 0.625rem 0; }
.bubble-content :deep(.line-break)   { height: 0.375rem; display: block; }
.bubble-content :deep(strong)        { font-weight: 600; }
.bubble-content :deep(em)            { font-style: italic; }
.bubble-content :deep(del)           { text-decoration: line-through; color: #9ca3af; }
.bubble-content :deep(.md-blockquote){ border-left: 3px solid #6366f1; padding-left: 0.75rem; margin: 0.375rem 0; font-style: italic; color: #6b7280; }

/* Table */
.bubble-content :deep(.md-table-wrapper) { overflow-x: auto; margin: 0.625rem 0; border-radius: 8px; border: 1px solid #e5e7eb; }
.bubble-content :deep(.md-table)     { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.bubble-content :deep(.md-table th)  { background: #f8fafc; font-weight: 600; padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
.bubble-content :deep(.md-table td)  { padding: 6px 12px; border-bottom: 1px solid #f1f5f9; color: #374151; }
.bubble-content :deep(.md-table tbody tr:last-child td) { border-bottom: none; }

/* Images */
.bubble-content :deep(.md-img) { border-radius: 10px; margin: 0.5rem 0; max-width: 100%; object-fit: cover; max-height: 200px; display: block; }

/* Shimmer placeholder */
.bubble-content :deep(.img-loading) {
  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Menu card grid */
.bubble-content :deep(.menu-card-grid) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  margin: 8px 0;
  width: 100%;
}
.bubble-content :deep(.menu-card) {
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.15s;
}
.bubble-content :deep(.menu-card:hover) { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.bubble-content :deep(.menu-card .md-img) { width: 100%; height: 100px; object-fit: cover; border-radius: 0; margin: 0; max-height: none; display: block; }
.bubble-content :deep(.menu-card-info)  { padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; }
.bubble-content :deep(.menu-card-info strong) { font-size: 0.75rem; font-weight: 600; color: #111827; line-height: 1.3; }
.bubble-content :deep(.menu-card-info .card-price) { font-size: 0.7rem; font-weight: 600; color: #8b1a1a; }
.bubble-content :deep(.menu-card-info .card-desc)  { font-size: 0.65rem; color: #9ca3af; line-height: 1.3; }

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .bubble-content :deep(.md-h3) { color: #9ca3af; }
  .bubble-content :deep(.inline-code) { background: #1e293b; color: #e2e8f0; }
  .bubble-content :deep(.md-hr), .bubble-content :deep(.md-table-wrapper),
  .bubble-content :deep(.md-table th), .bubble-content :deep(.md-table td) { border-color: #374151; }
  .bubble-content :deep(.md-table th) { background: #1f2937; color: #f9fafb; }
  .bubble-content :deep(.md-table td) { color: #d1d5db; }
  .bubble-content :deep(.menu-card) { background: #1f2937; border-color: #374151; }
  .bubble-content :deep(.menu-card-info strong) { color: #f9fafb; }
  .bubble-content :deep(.img-loading) {
    background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
    background-size: 200% 100%;
  }
}
</style>
