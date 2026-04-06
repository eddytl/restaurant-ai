<script setup>
import { ref, onMounted } from 'vue'
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
  insights:      'nav.insights',
  'admin-chat':  'nav.adminChat',
  branches:      'nav.branches',
}

function toggleLocale() {
  setLocale(locale.value === 'fr' ? 'en' : 'fr')
}

// ── Anthropic API status ──────────────────────────────────────────────────────
const apiStatus = ref(null)  // null | { state, checkedAt }

const statusConfig = {
  ok:                   { dot: 'bg-green-400',  label: 'API IA : OK',              tooltip: 'L\'API Anthropic est opérationnelle.' },
  insufficient_credits: { dot: 'bg-red-500',    label: 'Crédit insuffisant',        tooltip: 'Crédit Anthropic épuisé. Rechargez votre compte.' },
  invalid_key:          { dot: 'bg-red-500',    label: 'Clé API invalide',          tooltip: 'La clé API Anthropic est invalide ou expirée.' },
  error:                { dot: 'bg-orange-400', label: 'API IA : Erreur',           tooltip: 'L\'API Anthropic rencontre des difficultés.' },
  unknown:              { dot: 'bg-gray-400',   label: 'API IA : Vérification…',    tooltip: 'Vérification du statut en cours.' },
}

onMounted(async () => {
  if (!auth.isAdmin) return
  try {
    const res = await fetch('/api/admin-agent/api-status')
    if (res.ok) apiStatus.value = await res.json()
  } catch {}
})

const CONSOLE_URL = 'https://console.anthropic.com/settings/billing'
</script>

<template>
  <header class="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 md:px-6 shrink-0">
    <div class="flex items-center gap-3">
      <!-- Hamburger (mobile only) -->
      <button @click="sidebar.toggleMobile()" class="lg:hidden btn-ghost !px-2 !py-2" title="Menu">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      <h1 class="text-lg font-bold text-gray-900 dark:text-gray-100">
        {{ $t(titles[route.name] || 'nav.dashboard') }}
      </h1>
    </div>

    <div class="flex items-center gap-2">

      <!-- ── Anthropic API status (admin only) ── -->
      <template v-if="auth.isAdmin && apiStatus">
        <a
          :href="CONSOLE_URL"
          target="_blank"
          rel="noopener"
          :title="statusConfig[apiStatus.state]?.tooltip"
          :class="[
            'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
            apiStatus.state === 'ok'
              ? 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
              : apiStatus.state === 'insufficient_credits' || apiStatus.state === 'invalid_key'
                ? 'border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
          ]"
        >
          <span :class="['w-1.5 h-1.5 rounded-full', statusConfig[apiStatus.state]?.dot,
            apiStatus.state === 'ok' ? 'animate-pulse' : '']" />
          {{ statusConfig[apiStatus.state]?.label }}
          <!-- External link icon -->
          <svg class="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </a>
        <!-- Mobile: dot only -->
        <a :href="CONSOLE_URL" target="_blank" rel="noopener"
          :title="statusConfig[apiStatus.state]?.tooltip"
          class="sm:hidden p-2">
          <span :class="['block w-2 h-2 rounded-full', statusConfig[apiStatus.state]?.dot]" />
        </a>
      </template>

      <!-- Language toggle -->
      <button @click="toggleLocale()"
        class="btn-ghost !px-2 !py-1.5 flex items-center gap-1.5 text-xs font-semibold"
        :title="locale === 'fr' ? 'Switch to English' : 'Passer en français'">
        <span class="text-base leading-none">{{ locale === 'fr' ? '🇬🇧' : '🇫🇷' }}</span>
        <span>{{ locale === 'fr' ? 'EN' : 'FR' }}</span>
      </button>

      <!-- Dark mode toggle -->
      <button @click="theme.toggle()" class="btn-ghost !px-2.5 !py-2.5"
        :title="theme.dark ? $t('common.lightMode') : $t('common.darkMode')">
        <svg v-if="theme.dark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/>
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
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
