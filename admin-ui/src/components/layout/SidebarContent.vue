<script setup>
import { useI18n } from 'vue-i18n'
defineProps({
  collapsed: { type: Boolean, default: false },
  navItems:  { type: Array,   default: () => [] },
  isActive:  { type: Function, default: () => false },
  mobile:    { type: Boolean, default: false },
  user:      { type: Object,  default: null },
})
defineEmits(['navigate', 'toggleCollapse', 'logout'])
const { t } = useI18n()
</script>

<template>
  <!-- Logo row -->
  <div class="border-b border-gray-100 dark:border-gray-800 shrink-0">

    <!-- COLLAPSED: logo icon IS the expand button -->
    <button
      v-if="collapsed"
      @click="$emit('toggleCollapse')"
      title="Développer le menu"
      class="w-full py-4 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      <div class="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shrink-0">
       <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="14" fill="#8b1a1a"/>
              <!-- Plate -->
              <ellipse cx="14" cy="17" rx="8" ry="3" fill="white" opacity="0.15"/>
              <ellipse cx="14" cy="17" rx="8" ry="3" fill="none" stroke="white" stroke-width="1.2" opacity="0.9"/>
              <!-- Food dome -->
              <path d="M6 17 Q6 10 14 10 Q22 10 22 17" fill="white" opacity="0.22"/>
              <path d="M6 17 Q6 10 14 10 Q22 10 22 17" fill="none" stroke="white" stroke-width="1.2" opacity="0.9"/>
              <!-- Steam lines -->
              <path d="M11 8.5 Q10.5 7 11 5.5" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
              <path d="M14 8 Q13.5 6.5 14 5" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
              <path d="M17 8.5 Q16.5 7 17 5.5" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
            </svg>
      </div>
    </button>

    <!-- EXPANDED: logo + text + collapse/close button -->
    <div v-else class="px-4 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shrink-0">
         <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="14" fill="#8b1a1a"/>
              <!-- Plate -->
              <ellipse cx="14" cy="17" rx="8" ry="3" fill="white" opacity="0.15"/>
              <ellipse cx="14" cy="17" rx="8" ry="3" fill="none" stroke="white" stroke-width="1.2" opacity="0.9"/>
              <!-- Food dome -->
              <path d="M6 17 Q6 10 14 10 Q22 10 22 17" fill="white" opacity="0.22"/>
              <path d="M6 17 Q6 10 14 10 Q22 10 22 17" fill="none" stroke="white" stroke-width="1.2" opacity="0.9"/>
              <!-- Steam lines -->
              <path d="M11 8.5 Q10.5 7 11 5.5" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
              <path d="M14 8 Q13.5 6.5 14 5" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
              <path d="M17 8.5 Q16.5 7 17 5.5" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
            </svg>
        </div>
        <div class="min-w-0 overflow-hidden">
          <p class="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">Restaurant</p>
          <p class="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">Admin Panel</p>
        </div>
      </div>

      <button
        @click="$emit('toggleCollapse')"
        :title="mobile ? 'Fermer' : 'Réduire le menu'"
        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <!-- Mobile: X -->
        <svg v-if="mobile" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        <!-- Desktop: collapse left -->
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 p-2 space-y-0.5 overflow-y-auto">
    <p v-if="!collapsed"
      class="px-3 pt-3 pb-1.5 text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider whitespace-nowrap">
      {{ t('common.menu') }}
    </p>
    <div v-else class="pt-3" />

    <button
      v-for="item in navItems"
      :key="item.to"
      @click="$emit('navigate', item.to)"
      :title="collapsed ? item.name : undefined"
      :class="['sidebar-link w-full', isActive(item.to) ? 'active' : '',
        collapsed ? 'justify-center !px-0' : '']"
    >
      <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon"/>
      </svg>
      <Transition
        enter-active-class="transition-all duration-150 overflow-hidden"
        enter-from-class="opacity-0 w-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-100 overflow-hidden"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0 w-0"
      >
        <span v-if="!collapsed" class="whitespace-nowrap overflow-hidden">{{ item.name }}</span>
      </Transition>
    </button>
  </nav>

  <!-- User / Logout -->
  <div class="p-2 border-t border-gray-100 dark:border-gray-800 shrink-0">
    <div :class="['flex items-center gap-3 px-3 py-2.5 rounded-lg', collapsed ? 'justify-center' : '']">
      <div class="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
        {{ (user?.name || 'A')[0].toUpperCase() }}
      </div>
      <Transition
        enter-active-class="transition-all duration-150 overflow-hidden"
        enter-from-class="opacity-0 w-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-100 overflow-hidden"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0 w-0"
      >
        <div v-if="!collapsed" class="flex-1 min-w-0 overflow-hidden">
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate whitespace-nowrap">{{ user?.name || 'Admin' }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-500 truncate whitespace-nowrap">{{ user?.email || '' }}</p>
        </div>
      </Transition>
      <button
        @click="$emit('logout')"
        :class="['text-gray-400 hover:text-red-500 transition-colors shrink-0', collapsed ? '' : '']"
        title="Déconnexion"
      >
        <svg :class="collapsed ? 'w-4 h-4' : 'w-5 h-5'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
        </svg>
      </button>
    </div>
  </div>
</template>
