<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/composables/useApi'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import ToastNotif from '@/components/ui/ToastNotif.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'

const { t } = useI18n()

const orders = ref([])
const loading = ref(true)
const activeStatus = ref('all')
const page  = ref(1)
const limit = ref(20)
const total = ref(0)

const toast = ref(null)
const confirm = ref({ open: false, loading: false, order: null })

const statuses = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']
const statusLabels = computed(() => ({
  all: t('orders.all'), pending: t('orders.pending'), confirmed: t('orders.confirmed'),
  preparing: t('orders.preparing'), ready: t('orders.ready'),
  delivered: t('orders.delivered'), cancelled: t('orders.cancelled'),
}))

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, limit: limit.value }
    if (activeStatus.value !== 'all') params.status = activeStatus.value
    const res = await api.getOrders(params)
    orders.value = res.data || []
    total.value = res.total || orders.value.length
  } finally { loading.value = false }
}

onMounted(load)

function setStatus(s) { activeStatus.value = s; page.value = 1; load() }

async function updateStatus(order, status) {
  try {
    await api.updateOrder(order._id, { status })
    order.status = status
    toast.value?.add(`Statut mis à jour : ${statusLabels.value[status]}`, 'success')
  } catch(e) {
    toast.value?.add(e.message, 'error')
  }
}

function askCancel(order) {
  confirm.value = { open: true, loading: false, order }
}

async function doCancel() {
  confirm.value.loading = true
  try {
    await api.cancelOrder(confirm.value.order._id)
    confirm.value.order.status = 'cancelled'
    toast.value?.add('Commande annulée.', 'success')
  } catch(e) {
    toast.value?.add(e.message, 'error')
  } finally {
    confirm.value = { open: false, loading: false, order: null }
  }
}

const NEXT_STATUS = { pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'delivered' }
function fmt(n) { return n?.toLocaleString('fr-FR') }
function fmtDate(d) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }
</script>

<template>
  <div class="space-y-5">
    <!-- Status filter tabs -->
    <div class="card p-1 flex flex-wrap gap-1">
      <button v-for="s in statuses" :key="s"
        @click="setStatus(s)"
        :class="['px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', activeStatus === s
          ? 'bg-brand-600 text-white'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800']">
        {{ statusLabels[s] }}
      </button>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h3 class="font-semibold text-gray-900 dark:text-gray-100">
          {{ total }} commande{{ total !== 1 ? 's' : '' }}
        </h3>
      </div>

      <div v-if="loading" class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="th">{{ $t('orders.client') }}</th>
              <th class="th">{{ $t('orders.phone') }}</th>
              <th class="th">{{ $t('orders.items') }}</th>
              <th class="th">{{ $t('orders.total') }}</th>
              <th class="th">{{ $t('orders.status') }}</th>
              <th class="th">{{ $t('orders.date') }}</th>
              <th class="th">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <SkeletonRows :rows="6" :has-avatar="true"
            :cols="['w-1/5', 'w-1/6', 'w-1/4', 'w-1/8', 'w-1/8', 'w-1/6', 'w-16']" />
        </table>
      </div>
      <div v-else-if="orders.length" class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="th">{{ $t('orders.client') }}</th>
              <th class="th">{{ $t('orders.phone') }}</th>
              <th class="th">{{ $t('orders.items') }}</th>
              <th class="th">{{ $t('orders.total') }}</th>
              <th class="th">{{ $t('orders.status') }}</th>
              <th class="th">{{ $t('orders.date') }}</th>
              <th class="th">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
            <tr v-for="o in orders" :key="o._id" class="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
              <td class="td font-semibold text-gray-900 dark:text-gray-100">{{ o.customer?.name || '—' }}</td>
              <td class="td">{{ o.customer?.phone || '—' }}</td>
              <td class="td">
                <div class="max-w-xs">
                  <p v-for="item in o.items" :key="item._id" class="text-xs text-gray-500 dark:text-gray-400">
                    {{ item.quantity }}× {{ item.name }}
                  </p>
                </div>
              </td>
              <td class="td font-semibold">{{ fmt(o.totalAmount) }} XAF</td>
              <td class="td"><StatusBadge :status="o.status" /></td>
              <td class="td text-gray-400 text-xs">{{ fmtDate(o.createdAt) }}</td>
              <td class="td">
                <div class="flex items-center gap-2">
                  <button v-if="NEXT_STATUS[o.status]"
                    @click="updateStatus(o, NEXT_STATUS[o.status])"
                    class="text-xs px-2 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors font-medium">
                    → {{ statusLabels[NEXT_STATUS[o.status]] }}
                  </button>
                  <button v-if="!['cancelled','delivered'].includes(o.status)"
                    @click="askCancel(o)"
                    class="text-xs px-2 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    {{ $t('orders.cancelBtn') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-center text-gray-400 py-12 text-sm">{{ $t('orders.noOrders') }}</p>

      <PaginationBar
        :page="page" :limit="limit" :total="total"
        @update:page="p => { page = p; load() }"
        @update:limit="l => { limit = l; page = 1; load() }"
      />
    </div>

    <!-- Confirm modal -->
    <ConfirmModal
      :open="confirm.open"
      :loading="confirm.loading"
      title="Annuler la commande ?"
      :message="confirm.order ? `La commande de ${confirm.order.customer?.name || 'ce client'} sera définitivement annulée.` : ''"
      confirm-label="Oui, annuler"
      @confirm="doCancel"
      @cancel="confirm.open = false"
    />

    <ToastNotif ref="toast" />
  </div>
</template>
