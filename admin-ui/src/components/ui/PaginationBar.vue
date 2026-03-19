<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const props = defineProps({
  page:  { type: Number, required: true },
  limit: { type: Number, required: true },
  total: { type: Number, required: true },
})
const emit = defineEmits(['update:page', 'update:limit'])

const PAGE_SIZES = [10, 20, 50, 100]

const pages = () => Math.max(1, Math.ceil(props.total / props.limit))

function setLimit(val) {
  emit('update:limit', Number(val))
  emit('update:page', 1)
}
</script>

<template>
  <div class="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
    <!-- Left: total + per-page selector -->
    <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <span>{{ total }} {{ total !== 1 ? $t('pagination.results') : $t('pagination.result') }}</span>
      <span class="text-gray-300 dark:text-gray-700">·</span>
      <select
        :value="limit"
        @change="setLimit($event.target.value)"
        class="input !py-1 !px-2 !text-xs w-auto"
      >
        <option v-for="s in PAGE_SIZES" :key="s" :value="s">{{ s }} / page</option>
      </select>
    </div>

    <!-- Right: page info + prev/next -->
    <div class="flex items-center gap-2">
      <span class="text-sm text-gray-500 dark:text-gray-400">
        {{ $t('common.page') }} {{ page }} / {{ pages() }}
      </span>
      <button
        @click="emit('update:page', page - 1)"
        :disabled="page <= 1"
        class="btn-ghost !px-2.5 !py-1.5 disabled:opacity-40"
      >{{ $t('common.prev') }}</button>
      <button
        @click="emit('update:page', page + 1)"
        :disabled="page >= pages()"
        class="btn-ghost !px-2.5 !py-1.5 disabled:opacity-40"
      >{{ $t('common.next') }}</button>
    </div>
  </div>
</template>
