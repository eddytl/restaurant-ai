<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/composables/useApi'

const { t } = useI18n()

// ── Branches ──────────────────────────────────────────────────────────────────
const branches = ref([])
const branchId = ref('')

onMounted(async () => {
  try {
    const res = await api.getBranches({ active: true })
    branches.value = res.data || []
  } catch {}
})

// ── Alerts ────────────────────────────────────────────────────────────────────
const alerts      = ref([])
const branchName  = ref('')
const generatedAt = ref(null)
const loading     = ref(false)
const error       = ref('')
const filterCrit  = ref('all')   // 'all' | 'critical' | 'high' | 'medium' | 'low'

async function generate() {
  alerts.value    = []
  error.value     = ''
  loading.value   = true
  generatedAt.value = null

  try {
    const res = await fetch('/api/admin-agent/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId: branchId.value || undefined, lang: 'fr' }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message || 'Erreur serveur')

    // Sort: critical → high → medium → low
    const order = { critical: 0, high: 1, medium: 2, low: 3 }
    alerts.value    = (data.alerts || []).sort((a, b) => (order[a.criticality] ?? 9) - (order[b.criticality] ?? 9))
    branchName.value  = data.branchName
    generatedAt.value = data.generatedAt
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ── Filtered alerts ──────────────────────────────────────────────────────────
const filteredAlerts = computed(() =>
  filterCrit.value === 'all' ? alerts.value : alerts.value.filter(a => a.criticality === filterCrit.value)
)

// ── Counts per criticality ────────────────────────────────────────────────────
const counts = computed(() => ({
  critical: alerts.value.filter(a => a.criticality === 'critical').length,
  high:     alerts.value.filter(a => a.criticality === 'high').length,
  medium:   alerts.value.filter(a => a.criticality === 'medium').length,
  low:      alerts.value.filter(a => a.criticality === 'low').length,
}))

// ── Config maps ───────────────────────────────────────────────────────────────
const critConfig = {
  critical: {
    label: 'Critique',
    dot:   'bg-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    border: 'border-red-300 dark:border-red-700',
    header: 'bg-red-50 dark:bg-red-900/20',
    icon:  'text-red-500',
  },
  high: {
    label: 'Élevée',
    dot:   'bg-orange-500',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
    border: 'border-orange-300 dark:border-orange-700',
    header: 'bg-orange-50 dark:bg-orange-900/20',
    icon:  'text-orange-500',
  },
  medium: {
    label: 'Modérée',
    dot:   'bg-yellow-400',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
    border: 'border-yellow-300 dark:border-yellow-700',
    header: 'bg-yellow-50 dark:bg-yellow-900/20',
    icon:  'text-yellow-500',
  },
  low: {
    label: 'Faible',
    dot:   'bg-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-700',
    header: 'bg-blue-50 dark:bg-blue-900/20',
    icon:  'text-blue-400',
  },
}

const categoryIcons = {
  orders:     'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
  menu:       'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  customers:  'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  revenue:    'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  operations: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
}

function critIcon(criticality) {
  if (criticality === 'critical') return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  if (criticality === 'high')     return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  if (criticality === 'medium')   return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="flex-1">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ t('insights.title') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{{ t('insights.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="branchId" class="input text-sm py-1.5" :disabled="loading">
          <option value="">{{ t('insights.allBranches') }}</option>
          <option v-for="b in branches" :key="b._id" :value="b._id">{{ b.name }} — {{ b.city }}</option>
        </select>
        <button @click="generate" :disabled="loading" class="btn-primary gap-2 px-5">
          <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          {{ loading ? t('insights.generating') : t('insights.generate') }}
        </button>
      </div>
    </div>

    <!-- ── Error ──────────────────────────────────────────────────────────── -->
    <div v-if="error" class="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
      <svg class="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
      <div>
        <p class="text-sm font-semibold text-red-700 dark:text-red-400">Analyse impossible</p>
        <p class="text-sm text-red-600 dark:text-red-500 mt-0.5">{{ error }}</p>
      </div>
    </div>

    <!-- ── Empty / loading state ──────────────────────────────────────────── -->
    <div v-if="!alerts.length && !loading && !error"
      class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      <p class="font-medium text-gray-700 dark:text-gray-300">{{ t('insights.emptyTitle') }}</p>
      <p class="text-sm text-gray-400 dark:text-gray-600 mt-1 max-w-sm">{{ t('insights.placeholder') }}</p>
    </div>

    <!-- ── Loading skeleton ───────────────────────────────────────────────── -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i"
        class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden animate-pulse">
        <div class="h-14 bg-gray-100 dark:bg-gray-800" />
        <div class="p-4 space-y-2">
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div class="mt-3 space-y-1.5">
            <div class="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-full" />
            <div class="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-5/6" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── Results ────────────────────────────────────────────────────────── -->
    <template v-if="alerts.length">
      <!-- Meta info + filter bar -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3">
        <!-- Criticality summary chips -->
        <div class="flex flex-wrap gap-2 flex-1">
          <button @click="filterCrit = 'all'"
            :class="['px-3 py-1 rounded-full text-xs font-medium transition-colors border',
              filterCrit === 'all'
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-transparent'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400']">
            Toutes ({{ alerts.length }})
          </button>
          <button v-for="(cfg, key) in critConfig" :key="key"
            v-show="counts[key] > 0"
            @click="filterCrit = key"
            :class="['px-3 py-1 rounded-full text-xs font-medium transition-colors border flex items-center gap-1.5',
              filterCrit === key ? cfg.badge + ' border-transparent' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400']">
            <span :class="['w-1.5 h-1.5 rounded-full', cfg.dot]" />
            {{ cfg.label }} ({{ counts[key] }})
          </button>
        </div>
        <!-- Generated at -->
        <p v-if="generatedAt" class="text-xs text-gray-400 dark:text-gray-600 shrink-0">
          {{ branchName }} · {{ formatDate(generatedAt) }}
        </p>
      </div>

      <!-- Alert cards grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div v-for="alert in filteredAlerts" :key="alert.id"
          :class="['bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow', critConfig[alert.criticality]?.border || 'border-gray-200 dark:border-gray-700']">

          <!-- Card header -->
          <div :class="['px-4 py-3 flex items-start justify-between gap-3', critConfig[alert.criticality]?.header]">
            <div class="flex items-start gap-2.5 min-w-0">
              <!-- Criticality icon -->
              <svg :class="['w-5 h-5 shrink-0 mt-0.5', critConfig[alert.criticality]?.icon]"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="critIcon(alert.criticality)"/>
              </svg>
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">{{ alert.title }}</p>
            </div>
            <!-- Criticality badge -->
            <span :class="['shrink-0 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide', critConfig[alert.criticality]?.badge]">
              {{ critConfig[alert.criticality]?.label }}
            </span>
          </div>

          <!-- Card body -->
          <div class="px-4 py-3 flex-1 flex flex-col gap-3">
            <!-- Description -->
            <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{{ alert.description }}</p>

            <!-- Category badge -->
            <div class="flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="categoryIcons[alert.category] || categoryIcons.operations"/>
              </svg>
              <span class="text-xs text-gray-400 dark:text-gray-500 capitalize">{{ alert.category }}</span>
            </div>

            <!-- Separator -->
            <div class="border-t border-gray-100 dark:border-gray-800" />

            <!-- Actions correctives -->
            <div>
              <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Actions correctives</p>
              <ul class="space-y-1.5">
                <li v-for="(action, i) in alert.actions" :key="i"
                  class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span :class="['shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5', critConfig[alert.criticality]?.dot]">
                    {{ i + 1 }}
                  </span>
                  {{ action }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
