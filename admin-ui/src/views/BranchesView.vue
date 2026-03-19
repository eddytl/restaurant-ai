<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/composables/useApi'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import ToastNotif from '@/components/ui/ToastNotif.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'

const { t } = useI18n()

const branches  = ref([])
const loading   = ref(true)
const toast     = ref(null)
const showModal = ref(false)
const saving    = ref(false)
const editBranch = ref(null)
const confirmDel = ref({ open: false, loading: false, branch: null })

const form = ref({ name: '', address: '', city: '', phone: '', email: '', isActive: true })

async function load() {
  loading.value = true
  try {
    const res = await api.getBranches()
    branches.value = res.data || []
  } catch (e) {
    toast.value?.add(e.message, 'error')
  } finally { loading.value = false }
}

onMounted(load)

function openCreate() {
  editBranch.value = null
  form.value = { name: '', address: '', city: '', phone: '', email: '', isActive: true }
  showModal.value = true
}

function openEdit(b) {
  editBranch.value = b
  form.value = { name: b.name, address: b.address, city: b.city, phone: b.phone || '', email: b.email || '', isActive: b.isActive }
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    if (editBranch.value) {
      const res = await api.updateBranch(editBranch.value._id, form.value)
      Object.assign(editBranch.value, res.data)
      toast.value?.add(`Agence « ${res.data.name} » mise à jour.`, 'success')
    } else {
      const res = await api.createBranch(form.value)
      branches.value.unshift(res.data)
      toast.value?.add(`Agence « ${res.data.name} » créée.`, 'success')
    }
    showModal.value = false
  } catch (e) {
    toast.value?.add(e.message, 'error')
  } finally { saving.value = false }
}

async function toggleActive(b) {
  try {
    const res = await api.updateBranch(b._id, { isActive: !b.isActive })
    Object.assign(b, res.data)
  } catch (e) {
    toast.value?.add(e.message, 'error')
  }
}

function askDelete(b) {
  confirmDel.value = { open: true, loading: false, branch: b }
}

async function doDelete() {
  confirmDel.value.loading = true
  try {
    await api.deleteBranch(confirmDel.value.branch._id)
    branches.value = branches.value.filter(b => b._id !== confirmDel.value.branch._id)
    toast.value?.add('Agence supprimée.', 'success')
  } catch (e) {
    toast.value?.add(e.message, 'error')
  } finally {
    confirmDel.value = { open: false, loading: false, branch: null }
  }
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ branches.length }} {{ branches.length !== 1 ? 'agences' : 'agence' }}</p>
      <button @click="openCreate" class="btn-primary shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        {{ $t('branches.new') }}
      </button>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div v-if="loading" class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="th">{{ $t('branches.name') }}</th>
              <th class="th">{{ $t('branches.city') }}</th>
              <th class="th">{{ $t('branches.phone') }}</th>
              <th class="th">{{ $t('common.createdAt') }}</th>
              <th class="th">Statut</th>
              <th class="th">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <SkeletonRows :rows="4" :cols="['w-1/4', 'w-1/6', 'w-1/6', 'w-1/6', 'w-16', 'w-16']" />
        </table>
      </div>

      <div v-else-if="branches.length" class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="th">{{ $t('branches.name') }}</th>
              <th class="th">{{ $t('branches.city') }}</th>
              <th class="th">{{ $t('branches.phone') }}</th>
              <th class="th">{{ $t('common.createdAt') }}</th>
              <th class="th">Statut</th>
              <th class="th">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
            <tr v-for="b in branches" :key="b._id" class="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
              <td class="td">
                <div>
                  <p class="font-semibold text-gray-900 dark:text-gray-100">{{ b.name }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">{{ b.address }}</p>
                </div>
              </td>
              <td class="td text-gray-600 dark:text-gray-300">{{ b.city }}</td>
              <td class="td text-gray-500 dark:text-gray-400 text-sm">{{ b.phone || '—' }}</td>
              <td class="td text-xs text-gray-400">{{ fmtDate(b.createdAt) }}</td>
              <td class="td">
                <button @click="toggleActive(b)"
                  :class="['badge text-xs font-medium cursor-pointer transition-colors', b.isActive
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200']">
                  {{ b.isActive ? $t('branches.active') : $t('branches.inactive') }}
                </button>
              </td>
              <td class="td">
                <div class="flex items-center gap-2">
                  <button @click="openEdit(b)" class="btn-ghost !px-2.5 !py-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button @click="askDelete(b)" class="btn-ghost !px-2.5 !py-1.5 !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/20">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-else class="text-center text-gray-400 py-12 text-sm">{{ $t('branches.noBranches') }}</p>
    </div>

    <!-- Confirm delete -->
    <ConfirmModal
      :open="confirmDel.open"
      :loading="confirmDel.loading"
      :title="$t('branches.deleteConfirm')"
      :message="confirmDel.branch ? `« ${confirmDel.branch.name} » ${$t('branches.deleteMessage')}` : ''"
      :confirm-label="$t('common.delete')"
      @confirm="doDelete"
      @cancel="confirmDel.open = false"
    />

    <ToastNotif ref="toast" />

    <!-- Create / Edit modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showModal = false" />
        <div class="relative card w-full max-w-lg p-6 shadow-2xl">
          <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-5">
            {{ editBranch ? $t('branches.editTitle') : $t('branches.createTitle') }}
          </h3>
          <form @submit.prevent="save" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ $t('branches.name') }}</label>
                <input v-model="form.name" type="text" class="input" required />
              </div>
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ $t('branches.address') }}</label>
                <input v-model="form.address" type="text" class="input" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ $t('branches.city') }}</label>
                <input v-model="form.city" type="text" class="input" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ $t('branches.phone') }}</label>
                <input v-model="form.phone" type="tel" class="input" />
              </div>
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ $t('branches.email') }}</label>
                <input v-model="form.email" type="email" class="input" />
              </div>
              <div class="col-span-2 flex items-center gap-3">
                <button type="button" @click="form.isActive = !form.isActive"
                  :class="['relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0',
                    form.isActive ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600']">
                  <span :class="['inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    form.isActive ? 'translate-x-6' : 'translate-x-1']" />
                </button>
                <span class="text-sm text-gray-700 dark:text-gray-300">
                  {{ form.isActive ? $t('branches.active') : $t('branches.inactive') }}
                </span>
              </div>
            </div>
            <div class="flex gap-3 pt-2">
              <button type="button" @click="showModal = false" class="btn-ghost flex-1 justify-center">{{ $t('common.cancel') }}</button>
              <button type="submit" :disabled="saving" class="btn-primary flex-1 justify-center">
                <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ saving ? $t('common.saving') : $t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
