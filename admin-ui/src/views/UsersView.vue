<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/composables/useApi'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import ToastNotif from '@/components/ui/ToastNotif.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'

const { t } = useI18n()

const users   = ref([])
const loading = ref(true)
const page    = ref(1)
const limit   = ref(20)
const total   = ref(0)

const toast      = ref(null)
const confirmDel = ref({ open: false, loading: false, user: null })
const showModal  = ref(false)
const editUser   = ref(null)
const saving     = ref(false)

const form = ref({ name: '', email: '', password: '', role: 'user' })

async function load() {
  loading.value = true
  try {
    const res = await api.getUsers({ page: page.value, limit: limit.value })
    users.value = res.data || []
    total.value = res.total || 0
  } catch (e) {
    toast.value?.add(e.message, 'error')
  } finally { loading.value = false }
}

onMounted(load)

const pages = () => Math.ceil(total.value / limit.value)

function openCreate() {
  editUser.value = null
  form.value = { name: '', email: '', password: '', role: 'user' }
  showModal.value = true
}

function openEdit(u) {
  editUser.value = u
  form.value = { name: u.name, email: u.email, password: '', role: u.role }
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    const body = { name: form.value.name, email: form.value.email, role: form.value.role }
    if (form.value.password) body.password = form.value.password
    if (editUser.value) {
      const res = await api.updateUser(editUser.value._id, body)
      Object.assign(editUser.value, res.data)
      toast.value?.add(`Utilisateur « ${res.data.name} » mis à jour.`, 'success')
    } else {
      if (!form.value.password) {
        toast.value?.add('Le mot de passe est requis.', 'error')
        return
      }
      body.password = form.value.password
      const res = await api.createUser(body)
      users.value.unshift(res.data)
      total.value++
      toast.value?.add(`Utilisateur « ${res.data.name} » créé.`, 'success')
    }
    showModal.value = false
  } catch (e) {
    toast.value?.add(e.message, 'error')
  } finally { saving.value = false }
}

function askDelete(u) {
  confirmDel.value = { open: true, loading: false, user: u }
}

async function doDelete() {
  confirmDel.value.loading = true
  try {
    await api.deleteUser(confirmDel.value.user._id)
    users.value = users.value.filter(u => u._id !== confirmDel.value.user._id)
    total.value--
    toast.value?.add('Utilisateur supprimé.', 'success')
  } catch (e) {
    toast.value?.add(e.message, 'error')
  } finally {
    confirmDel.value = { open: false, loading: false, user: null }
  }
}

function roleBadge(role) {
  return role === 'admin'
    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']
function color(name) { return colors[(name?.charCodeAt(0) || 0) % colors.length] }
function initials(name) { return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() }
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ total }} utilisateur{{ total !== 1 ? 's' : '' }}</p>
      <button @click="openCreate" class="btn-primary shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Nouvel utilisateur
      </button>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div v-if="loading" class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="th">{{ $t('common.name') }}</th>
              <th class="th">{{ $t('common.email') }}</th>
              <th class="th">{{ $t('common.role') }}</th>
              <th class="th">{{ $t('common.createdAt') }}</th>
              <th class="th">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <SkeletonRows :rows="5" :has-avatar="true"
            :cols="['w-1/4', 'w-1/4', 'w-1/8', 'w-1/6', 'w-16']" />
        </table>
      </div>
      <div v-else-if="users.length" class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="th">{{ $t('common.name') }}</th>
              <th class="th">{{ $t('common.email') }}</th>
              <th class="th">{{ $t('common.role') }}</th>
              <th class="th">{{ $t('common.createdAt') }}</th>
              <th class="th">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
            <tr v-for="u in users" :key="u._id" class="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
              <td class="td">
                <div class="flex items-center gap-3">
                  <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0', color(u.name)]">
                    {{ initials(u.name) }}
                  </div>
                  <span class="font-semibold text-gray-900 dark:text-gray-100">{{ u.name }}</span>
                </div>
              </td>
              <td class="td text-gray-500 dark:text-gray-400">{{ u.email }}</td>
              <td class="td">
                <span :class="['badge text-xs font-medium', roleBadge(u.role)]">
                  {{ u.role === 'admin' ? $t('users.admin') : $t('users.user') }}
                </span>
              </td>
              <td class="td text-xs text-gray-400">{{ fmtDate(u.createdAt) }}</td>
              <td class="td">
                <div class="flex items-center gap-2">
                  <button @click="openEdit(u)" class="btn-ghost !px-2.5 !py-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button @click="askDelete(u)" class="btn-ghost !px-2.5 !py-1.5 !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/20">
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
      <p v-else class="text-center text-gray-400 py-12 text-sm">{{ $t('users.noUsers') }}</p>

      <PaginationBar
        :page="page" :limit="limit" :total="total"
        @update:page="p => { page = p; load() }"
        @update:limit="l => { limit = l; page = 1; load() }"
      />
    </div>

    <!-- Confirm delete -->
    <ConfirmModal
      :open="confirmDel.open"
      :loading="confirmDel.loading"
      title="Supprimer cet utilisateur ?"
      :message="confirmDel.user ? `« ${confirmDel.user.name} » sera définitivement supprimé.` : ''"
      confirm-label="Supprimer"
      @confirm="doDelete"
      @cancel="confirmDel.open = false"
    />

    <ToastNotif ref="toast" />

    <!-- Create / Edit modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showModal = false" />
        <div class="relative card w-full max-w-md p-6 shadow-2xl">
          <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-5">
            {{ editUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur' }}
          </h3>
          <form @submit.prevent="save" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nom</label>
              <input v-model="form.name" type="text" class="input" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <input v-model="form.email" type="email" class="input" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Mot de passe {{ editUser ? '(laisser vide pour ne pas changer)' : '' }}
              </label>
              <input v-model="form.password" type="password" class="input" :required="!editUser" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rôle</label>
              <select v-model="form.role" class="input">
                <option value="user">Utilisateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div class="flex gap-3 pt-2">
              <button type="button" @click="showModal = false" class="btn-ghost flex-1 justify-center">Annuler</button>
              <button type="submit" :disabled="saving" class="btn-primary flex-1 justify-center">
                <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
