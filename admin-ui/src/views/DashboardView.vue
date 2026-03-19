<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/composables/useApi'
import KpiCard from '@/components/ui/KpiCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, Title, LineElement, PointElement, Filler
} from 'chart.js'

const { t, locale } = useI18n()

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title, LineElement, PointElement, Filler)

const customers = ref([])
const orders = ref([])
const conversations = ref([])
const menu = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [c, o, conv, m] = await Promise.all([
      api.getCustomers(),
      api.getOrders({ limit: 100 }),
      api.getConversations({ limit: 100 }),
      api.getMenu(),
    ])
    customers.value = c.data || []
    orders.value = o.data || []
    conversations.value = conv.data || []
    menu.value = m.data || []
  } finally {
    loading.value = false
  }
})

const totalRevenue = computed(() =>
  orders.value.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.totalAmount || 0), 0)
)

const recentOrders = computed(() => [...orders.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6))

// Monthly sales bar chart
const monthlyData = computed(() => {
  const lang = locale.value === 'en' ? 'en-GB' : 'fr-FR'
  const months = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i, 1).toLocaleDateString(lang, { month: 'short' })
  )
  const counts = Array(12).fill(0)
  orders.value.filter(o => o.status !== 'cancelled').forEach(o => {
    const m = new Date(o.createdAt).getMonth()
    counts[m]++
  })
  return { labels: months, data: counts }
})

const barData = computed(() => ({
  labels: monthlyData.value.labels,
  datasets: [{
    label: t('dashboard.ordersLabel'),
    data: monthlyData.value.data,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    borderSkipped: false,
  }]
}))

const barOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => ` ${ctx.raw} ${ctx.raw !== 1 ? t('dashboard.ordersTooltip') : t('dashboard.orderTooltip')}`,
      },
    },
  },
  scales: {
    x: { grid: { display: false }, border: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
    y: { grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 }, stepSize: 1 } },
  },
}))

// Status doughnut
const statusData = computed(() => {
  const map = {}
  orders.value.forEach(o => { map[o.status] = (map[o.status] || 0) + 1 })
  return {
    labels: Object.keys(map),
    datasets: [{
      data: Object.values(map),
      backgroundColor: ['#fbbf24','#60a5fa','#a78bfa','#2dd4bf','#34d399','#f87171'],
      borderWidth: 0,
    }]
  }
})

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, color: '#94a3b8', padding: 12 } } },
  cutout: '70%',
}

// Daily orders line chart — last 30 days
const dailyRange = ref(30) // 7 | 14 | 30

const dailyData = computed(() => {
  const days = dailyRange.value
  const now = new Date()
  const labels = []
  const counts = []
  const revenue = []
  const lang = locale.value === 'en' ? 'en-GB' : 'fr-FR'

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    labels.push(d.toLocaleDateString(lang, { day: '2-digit', month: 'short' }))
    const dayOrders = orders.value.filter(o => {
      return o.createdAt?.slice(0, 10) === key && o.status !== 'cancelled'
    })
    counts.push(dayOrders.length)
    revenue.push(dayOrders.reduce((s, o) => s + (o.totalAmount || 0), 0))
  }
  return { labels, counts, revenue }
})

const lineData = computed(() => ({
  labels: dailyData.value.labels,
  datasets: [
    {
      label: t('dashboard.ordersLabel'),
      data: dailyData.value.counts,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.08)',
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: '#3b82f6',
      tension: 0.4,
      fill: true,
      yAxisID: 'y',
    },
    {
      label: t('dashboard.revenueLabel'),
      data: dailyData.value.revenue,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.06)',
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: '#10b981',
      tension: 0.4,
      fill: true,
      yAxisID: 'y1',
    },
  ],
}))

const lineOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      position: 'top',
      align: 'end',
      labels: { boxWidth: 10, font: { size: 11 }, color: '#94a3b8', padding: 16, usePointStyle: true },
    },
    tooltip: {
      callbacks: {
        label: ctx => ctx.datasetIndex === 0
          ? ` ${ctx.raw} ${ctx.raw !== 1 ? t('dashboard.ordersTooltip') : t('dashboard.orderTooltip')}`
          : ` ${ctx.raw.toLocaleString(locale.value === 'en' ? 'en-GB' : 'fr-FR')} XAF`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#94a3b8', font: { size: 10 }, maxTicksLimit: dailyRange.value > 14 ? 10 : undefined },
    },
    y: {
      position: 'left',
      grid: { color: 'rgba(148,163,184,0.1)' },
      border: { display: false },
      ticks: { color: '#94a3b8', font: { size: 11 }, stepSize: 1 },
    },
    y1: {
      position: 'right',
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#10b981', font: { size: 11 }, callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v },
    },
  },
}))

// Today's stats
const todayKey = new Date().toISOString().slice(0, 10)
const todayOrders = computed(() => orders.value.filter(o => o.createdAt?.slice(0, 10) === todayKey))
const todayRevenue = computed(() => todayOrders.value.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.totalAmount || 0), 0))

function fmt(n) { return (n || 0).toLocaleString(locale.value === 'en' ? 'en-GB' : 'fr-FR') }
function fmtDate(d) {
  const lang = locale.value === 'en' ? 'en-GB' : 'fr-FR'
  return new Date(d).toLocaleDateString(lang, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="space-y-6">
    <!-- KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard :title="$t('dashboard.customers')" :value="fmt(customers.length)"
        :sub="$t('dashboard.customersub')" :loading="loading"
        icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        iconBg="bg-blue-50 dark:bg-blue-900/20" iconColor="text-blue-600 dark:text-blue-400" />

      <KpiCard :title="$t('dashboard.orders')" :value="fmt(orders.length)"
        :sub="$t('dashboard.ordersub')" :loading="loading"
        icon="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        iconBg="bg-purple-50 dark:bg-purple-900/20" iconColor="text-purple-600 dark:text-purple-400" />

      <KpiCard :title="$t('dashboard.revenue')" :value="fmt(totalRevenue) + ' XAF'"
        :sub="$t('dashboard.revenuesub')" :loading="loading"
        icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        iconBg="bg-green-50 dark:bg-green-900/20" iconColor="text-green-600 dark:text-green-400" />

      <KpiCard :title="$t('dashboard.menuItems')" :value="fmt(menu.length)"
        :sub="$t('dashboard.menuItemsSub')" :loading="loading"
        icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        iconBg="bg-orange-50 dark:bg-orange-900/20" iconColor="text-orange-600 dark:text-orange-400" />
    </div>

    <!-- Charts row -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Bar chart -->
      <div class="card p-5 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ $t('dashboard.monthlyOrders') }}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ $t('dashboard.currentYear') }}</p>
          </div>
        </div>
        <div class="h-52">
          <Bar v-if="!loading" :data="barData" :options="barOptions" />
          <div v-else class="h-full bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        </div>
      </div>

      <!-- Doughnut -->
      <div class="card p-5">
        <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-1">{{ $t('dashboard.orderStatuses') }}</h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">{{ $t('dashboard.statusDistribution') }}</p>
        <div class="h-52">
          <Doughnut v-if="!loading && orders.length" :data="statusData" :options="doughnutOptions" />
          <div v-else-if="loading" class="h-full bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          <p v-else class="text-center text-gray-400 mt-16 text-sm">{{ $t('dashboard.noData') }}</p>
        </div>
      </div>
    </div>

    <!-- Daily orders line chart -->
    <div class="card p-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ $t('dashboard.dailyOrders') }}</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {{ $t('dashboard.todaySubtitle') }}
            <span class="font-semibold text-gray-700 dark:text-gray-200">{{ todayOrders.length }} {{ todayOrders.length !== 1 ? $t('dashboard.ordersTooltip') : $t('dashboard.orderTooltip') }}</span>
            · <span class="font-semibold text-green-600 dark:text-green-400">{{ fmt(todayRevenue) }} XAF</span>
          </p>
        </div>
        <!-- Range selector -->
        <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 self-start sm:self-auto">
          <button v-for="d in [7, 14, 30]" :key="d"
            @click="dailyRange = d"
            :class="['px-3 py-1 rounded-md text-xs font-medium transition-colors',
              dailyRange === d
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200']">
            {{ d }}{{ $t('dashboard.days') }}
          </button>
        </div>
      </div>
      <div class="h-64">
        <Line v-if="!loading" :data="lineData" :options="lineOptions" />
        <div v-else class="h-full bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    </div>

    <!-- Recent orders -->
    <div class="card overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ $t('dashboard.recentOrders') }}</h3>
        <RouterLink to="/orders" class="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline">{{ $t('dashboard.viewAll') }}</RouterLink>
      </div>
      <div v-if="loading" class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="th">{{ $t('orders.client') }}</th>
              <th class="th">{{ $t('orders.phone') }}</th>
              <th class="th">{{ $t('orders.total') }}</th>
              <th class="th">{{ $t('orders.status') }}</th>
              <th class="th">{{ $t('orders.date') }}</th>
            </tr>
          </thead>
          <SkeletonRows :rows="5" :has-avatar="true"
            :cols="['w-1/4', 'w-1/6', 'w-1/6', 'w-1/8', 'w-1/5']" />
        </table>
      </div>
      <div v-else-if="recentOrders.length" class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="th">{{ $t('orders.client') }}</th>
              <th class="th">{{ $t('orders.phone') }}</th>
              <th class="th">{{ $t('orders.total') }}</th>
              <th class="th">{{ $t('orders.status') }}</th>
              <th class="th">{{ $t('orders.date') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
            <tr v-for="o in recentOrders" :key="o._id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td class="td font-medium text-gray-900 dark:text-gray-100">{{ o.customer?.name || '—' }}</td>
              <td class="td">{{ o.customer?.phone || '—' }}</td>
              <td class="td font-semibold">{{ fmt(o.totalAmount) }} XAF</td>
              <td class="td"><StatusBadge :status="o.status" /></td>
              <td class="td text-gray-400">{{ fmtDate(o.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-center text-gray-400 py-10 text-sm">{{ $t('dashboard.noOrders') }}</p>
    </div>
  </div>
</template>
