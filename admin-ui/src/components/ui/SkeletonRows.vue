<script setup>
defineProps({
  rows:    { type: Number, default: 5 },
  cols:    { type: Array, default: () => ['w-1/4', 'w-1/5', 'w-1/6', 'w-1/5', 'w-1/6'] },
  hasAvatar: { type: Boolean, default: false },
})
</script>

<template>
  <tbody>
    <tr v-for="i in rows" :key="i" class="border-b border-gray-50 dark:border-gray-800 last:border-0">
      <td v-for="(w, j) in cols" :key="j" class="px-4 py-3">
        <div class="flex items-center gap-2">
          <!-- Avatar circle on first column if requested -->
          <div v-if="hasAvatar && j === 0"
            class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
          <div :class="['h-3.5 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse', w,
            i % 3 === 0 ? 'opacity-60' : i % 2 === 0 ? 'opacity-80' : 'opacity-100']" />
        </div>
      </td>
    </tr>
  </tbody>
</template>
