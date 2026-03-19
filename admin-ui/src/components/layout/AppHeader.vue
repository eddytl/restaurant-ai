<script setup>
import { useRoute } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { useSidebarStore } from '@/stores/sidebar'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'

const route   = useRoute()
const theme   = useThemeStore()
const sidebar = useSidebarStore()
const auth    = useAuthStore()
const { locale } = useI18n()

const titles = {
  dashboard:     'nav.dashboard',
  menu:          'nav.menu',
  orders:        'nav.orders',
  customers:     'nav.customers',
  conversations: 'nav.conversations',
  users:         'nav.users',
}

function toggleLocale() {
  setLocale(locale.value === 'fr' ? 'en' : 'fr')
}
</script>

<template>
  <header class="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 md:px-6 shrink-0">
    <div class="flex items-center gap-3">
      <!-- Hamburger (mobile only) -->
      <button
        @click="sidebar.toggleMobile()"
        class="lg:hidden btn-ghost !px-2 !py-2"
        title="Menu"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      <h1 class="text-lg font-bold text-gray-900 dark:text-gray-100">
        {{ $t(titles[route.name] || 'nav.dashboard') }}
      </h1>
    </div>

    <div class="flex items-center gap-2">
      <!-- Language toggle -->
      <button
        @click="toggleLocale()"
        class="btn-ghost !px-2 !py-1.5 flex items-center gap-1.5 text-xs font-semibold"
        :title="locale === 'fr' ? 'Switch to English' : 'Passer en français'"
      >
        <span class="text-base leading-none">{{ locale === 'fr' ? '🇬🇧' : '🇫🇷' }}</span>
        <span>{{ locale === 'fr' ? 'EN' : 'FR' }}</span>
      </button>

      <!-- Dark mode toggle -->
      <button
        @click="theme.toggle()"
        class="btn-ghost !px-2.5 !py-2.5"
        :title="theme.dark ? $t('common.lightMode') : $t('common.darkMode')"
      >
        <svg v-if="theme.dark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      </button>

      <!-- Separator -->
      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700" />

      <!-- Avatar with name -->
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
          {{ (auth.user?.name || 'A')[0].toUpperCase() }}
        </div>
        <span class="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">{{ auth.user?.name || 'Admin' }}</span>
      </div>
    </div>
  </header>
</template>
