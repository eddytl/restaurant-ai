<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/composables/useApi'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'

const { t } = useI18n()

const customers = ref([])
const loading   = ref(true)
const search    = ref('')
const page      = ref(1)
const limit     = ref(20)
const total     = ref(0)

let searchTimer = null

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, limit: limit.value }
    if (search.value) params.search = search.value
    const res = await api.getCustomers(params)
    customers.value = res.data || []
    total.value = res.total || 0
  } finally { loading.value = false }
}

onMounted(load)

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 350)
}

function fmt(n) { return (n || 0).toLocaleString('fr-FR') }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }
function initials(name) { return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() }

const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']
function color(name) { return colors[(name?.charCodeAt(0) || 0) % colors.length] }
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center gap-3">
      <div class="relative flex-1 max-w-sm">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input v-model="search" @input="onSearch" type="text" :placeholder="$t('customers.searchPlaceholder')" class="input pl-9" />
      </div>
      <span class="text-sm text-gray-500 dark:text-gray-400 shrink-0">{{ total }} client{{ total !== 1 ? 's' : '' }}</span>
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="th">{{ $t('customers.client') }}</th>
              <th class="th">{{ $t('customers.phone') }}</th>
              <th class="th">{{ $t('customers.orders') }}</th>
              <th class="th">{{ $t('customers.totalSpent') }}</th>
              <th class="th">{{ $t('customers.lastOrder') }}</th>
            </tr>
          </thead>
          <SkeletonRows :rows="7" :has-avatar="true"
            :cols="['w-1/4', 'w-1/6', 'w-1/8', 'w-1/5', 'w-1/5']" />
        </table>
      </div>
      <div v-else-if="customers.length" class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="th">{{ $t('customers.client') }}</th>
              <th class="th">{{ $t('customers.phone') }}</th>
              <th class="th">{{ $t('customers.orders') }}</th>
              <th class="th">{{ $t('customers.totalSpent') }}</th>
              <th class="th">{{ $t('customers.lastOrder') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
            <tr v-for="c in customers" :key="c._id" class="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
              <td class="td">
                <div class="flex items-center gap-3">
                  <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0', color(c.name)]">
                    {{ initials(c.name) }}
                  </div>
                  <span class="font-semibold text-gray-900 dark:text-gray-100">{{ c.name }}</span>
                </div>
              </td>
              <td class="td">{{ c.phone }}</td>
              <td class="td">
                <span class="font-semibold text-gray-900 dark:text-gray-100">{{ c.totalOrders }}</span>
                <span class="text-gray-400 text-xs ml-1">commande{{ c.totalOrders !== 1 ? 's' : '' }}</span>
              </td>
              <td class="td font-semibold text-green-600 dark:text-green-400">{{ fmt(c.totalSpent) }} XAF</td>
              <td class="td text-gray-400 text-xs">{{ fmtDate(c.lastOrderAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-center text-gray-400 py-12 text-sm">{{ $t('customers.noCustomers') }}</p>

      <PaginationBar
        :page="page" :limit="limit" :total="total"
        @update:page="p => { page = p; load() }"
        @update:limit="l => { limit = l; page = 1; load() }"
      />
    </div>
  </div>
</template>
