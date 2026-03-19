<script setup>
defineProps({
  title:    String,
  value:    [String, Number],
  sub:      String,
  trend:    String,
  trendUp:  Boolean,
  icon:     String,
  iconBg:   { type: String, default: 'bg-brand-50 dark:bg-brand-900/20' },
  iconColor:{ type: String, default: 'text-brand-600 dark:text-brand-400' },
  loading:  { type: Boolean, default: false },
})
</script>

<template>
  <div class="card p-5 flex items-start gap-4">
    <!-- Icon / skeleton -->
    <div v-if="loading" class="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
    <div v-else :class="['w-12 h-12 rounded-xl flex items-center justify-center shrink-0', iconBg]">
      <svg :class="['w-6 h-6', iconColor]" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" :d="icon" />
      </svg>
    </div>

    <div class="flex-1 min-w-0 space-y-2" v-if="loading">
      <div class="h-3 w-20 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div class="h-6 w-28 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div class="h-3 w-16 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse opacity-60" />
    </div>
    <div v-else class="flex-1 min-w-0">
      <p class="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">{{ title }}</p>
      <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ value }}</p>
      <div v-if="trend || sub" class="flex items-center gap-1.5 mt-1">
        <span v-if="trend" :class="['text-xs font-semibold', trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400']">
          {{ trendUp ? '↑' : '↓' }} {{ trend }}
        </span>
        <span v-if="sub" class="text-xs text-gray-400 dark:text-gray-500">{{ sub }}</span>
      </div>
    </div>
  </div>
</template>
