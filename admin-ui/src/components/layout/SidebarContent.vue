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
        <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <!-- Toque dome -->
          <path d="M8 10c0-2.21 1.79-4 4-4s4 1.79 4 4"/>
          <!-- Hat band -->
          <path d="M7 10h10v2H7z" stroke="none" fill="currentColor" opacity="0.9"/>
          <!-- Hat brim -->
          <line x1="6" y1="12" x2="18" y2="12"/>
          <!-- Head -->
          <circle cx="12" cy="15.5" r="2"/>
          <!-- Chef coat shoulders -->
          <path d="M7 24v-3.5c0-1.5 2-2.5 5-2.5s5 1 5 2.5V24"/>
          <!-- Coat lapels -->
          <path d="M11 18l1 2 1-2"/>
        </svg>
      </div>
    </button>

    <!-- EXPANDED: logo + text + collapse/close button -->
    <div v-else class="px-4 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 10c0-2.21 1.79-4 4-4s4 1.79 4 4"/>
            <path d="M7 10h10v2H7z" stroke="none" fill="currentColor" opacity="0.9"/>
            <line x1="6" y1="12" x2="18" y2="12"/>
            <circle cx="12" cy="15.5" r="2"/>
            <path d="M7 24v-3.5c0-1.5 2-2.5 5-2.5s5 1 5 2.5V24"/>
            <path d="M11 18l1 2 1-2"/>
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
