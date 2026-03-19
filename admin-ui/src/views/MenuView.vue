<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/composables/useApi'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import ToastNotif from '@/components/ui/ToastNotif.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'

const { t } = useI18n()

const items      = ref([])
const categories = ref([])
const loading    = ref(true)
const filterCat  = ref('')
const search     = ref('')
const page       = ref(1)
const limit      = ref(24)
const total      = ref(0)
const showModal  = ref(false)
const editItem   = ref(null)
const saving     = ref(false)
const uploadingId = ref(null)

const toast      = ref(null)
const confirmDel = ref({ open: false, loading: false, item: null })

const form = ref({ name: '', category: '', price: '', description: '', available: true })

const pages = computed(() => Math.ceil(total.value / limit.value))
const catNames = computed(() => [...new Set(items.value.map(i => i.category?.name).filter(Boolean))])

let searchTimer = null

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, limit: limit.value }
    if (filterCat.value) params.category = filterCat.value
    if (search.value) params.name = search.value
    const [m, c] = await Promise.all([api.getMenu(params), categories.value.length ? null : api.getCategories()])
    items.value = m.data || []
    total.value = m.total || 0
    if (c) categories.value = c.data || []
  } finally { loading.value = false }
}

onMounted(load)

function onFilterChange() { page.value = 1; load() }
function onSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(onFilterChange, 350) }

function openCreate() {
  editItem.value = null
  form.value = { name: '', category: categories.value[0]?.name || '', price: '', description: '', available: true }
  showModal.value = true
}

function openEdit(item) {
  editItem.value = item
  form.value = { name: item.name, category: item.category?.name || '', price: item.price, description: item.description || '', available: item.available }
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    const cat = categories.value.find(c => c.name === form.value.category)
    const body = { name: form.value.name, category: cat?._id, price: Number(form.value.price), description: form.value.description, available: form.value.available }
    if (editItem.value) {
      await api.updateMenuItem(editItem.value._id, body)
      Object.assign(editItem.value, { ...body, category: cat })
      toast.value?.add(`« ${body.name} » mis à jour.`, 'success')
    } else {
      await api.createMenuItem(body)
      await load()
      toast.value?.add(`« ${body.name} » ajouté au menu.`, 'success')
    }
    showModal.value = false
  } catch(e) {
    toast.value?.add(e.message, 'error')
  } finally { saving.value = false }
}

async function toggleAvailability(item) {
  try {
    await api.updateMenuItem(item._id, { available: !item.available })
    item.available = !item.available
    toast.value?.add(item.available ? `« ${item.name} » remis disponible.` : `« ${item.name} » marqué épuisé.`, 'success')
  } catch(e) {
    toast.value?.add(e.message, 'error')
  }
}

function askDelete(item) {
  confirmDel.value = { open: true, loading: false, item }
}

async function doDelete() {
  confirmDel.value.loading = true
  try {
    const deletedName = confirmDel.value.item.name
    await api.deleteMenuItem(confirmDel.value.item._id)
    await load()
    toast.value?.add(`« ${deletedName} » supprimé.`, 'success')
  } catch(e) {
    toast.value?.add(e.message, 'error')
  } finally {
    confirmDel.value = { open: false, loading: false, item: null }
  }
}

async function uploadImage(item, e) {
  const file = e.target.files[0]
  if (!file) return
  uploadingId.value = item._id
  try {
    const res = await api.uploadImage(item._id, file)
    if (res.success) item.media = res.data.media
    toast.value?.add('Photo mise à jour.', 'success')
  } catch(e) {
    toast.value?.add(e.message, 'error')
  } finally { uploadingId.value = null; e.target.value = '' }
}

function fmt(n) { return (n || 0).toLocaleString('fr-FR') }
</script>

<template>
  <div class="space-y-5">
    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div class="relative flex-1 max-w-sm">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input v-model="search" @input="onSearch" type="text" :placeholder="$t('menu.searchPlaceholder')" class="input pl-9" />
      </div>
      <select v-model="filterCat" @change="onFilterChange" class="input w-auto">
        <option value="">{{ $t('menu.allCategories') }}</option>
        <option v-for="c in catNames" :key="c" :value="c">{{ c }}</option>
      </select>
      <button @click="openCreate" class="btn-primary shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        {{ $t('menu.addItem') }}
      </button>
    </div>

    <!-- Grid -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div v-for="i in 8" :key="i" class="card overflow-hidden flex flex-col">
        <!-- Image skeleton -->
        <div class="h-40 bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <!-- Body skeleton -->
        <div class="p-4 flex-1 flex flex-col gap-2">
          <div class="flex justify-between items-start gap-2">
            <div class="h-3.5 w-2/3 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div class="h-5 w-14 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
          <div class="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse opacity-60" />
          <div class="h-3 w-3/4 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse opacity-40" />
          <div class="h-4 w-1/3 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse mt-auto" />
        </div>
        <!-- Actions skeleton -->
        <div class="px-4 pb-4 pt-3 border-t border-gray-50 dark:border-gray-800 flex gap-2">
          <div class="h-7 flex-1 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div class="h-7 w-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div class="h-7 w-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
      </div>
    </div>

    <div v-else-if="items.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div v-for="item in items" :key="item._id" class="card overflow-hidden group flex flex-col">
        <!-- Image -->
        <div class="relative h-40 bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <img v-if="item.media?.url" :src="item.media.url" :alt="item.name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div v-else class="w-full h-full flex items-center justify-center">
            <svg class="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <!-- Upload overlay -->
          <label :for="`img-${item._id}`"
            class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
            <div v-if="uploadingId === item._id" class="text-white">
              <svg class="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
            <div v-else class="text-white text-center">
              <svg class="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              <span class="text-xs font-medium">Photo</span>
            </div>
            <input :id="`img-${item._id}`" type="file" accept="image/*" class="hidden" @change="uploadImage(item, $event)" />
          </label>
          <!-- Category badge -->
          <span class="absolute top-2 left-2 badge bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 text-xs">
            {{ item.category?.name || '—' }}
          </span>
        </div>

        <!-- Body -->
        <div class="p-4 flex-1 flex flex-col">
          <div class="flex items-start justify-between gap-2 mb-1">
            <h4 class="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug">{{ item.name }}</h4>
            <StatusBadge :status="item.available ? 'available' : 'unavailable'" />
          </div>
          <p v-if="item.description" class="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{{ item.description }}</p>
          <p class="text-base font-bold text-brand-600 dark:text-brand-400 mt-auto">{{ fmt(item.price) }} XAF</p>
        </div>

        <!-- Actions -->
        <div class="px-4 pb-4 flex items-center gap-2 border-t border-gray-50 dark:border-gray-800 pt-3">
          <button @click="toggleAvailability(item)"
            :class="['flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors',
              item.available
                ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100'
                : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100']">
            {{ item.available ? $t('menu.markUnavailable') : $t('menu.markAvailable') }}
          </button>
          <button @click="openEdit(item)" class="btn-ghost !px-2.5 !py-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button @click="askDelete(item)" class="btn-ghost !px-2.5 !py-1.5 !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/20">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <p v-else class="text-center text-gray-400 py-16 text-sm">{{ $t('menu.noItems') }}</p>

    <!-- Pagination -->
    <div class="card">
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
      title="Supprimer ce plat ?"
      :message="confirmDel.item ? `« ${confirmDel.item.name} » sera définitivement supprimé du menu.` : ''"
      confirm-label="Supprimer"
      @confirm="doDelete"
      @cancel="confirmDel.open = false"
    />

    <ToastNotif ref="toast" />

    <!-- Modal create/edit -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showModal = false" />
        <div class="relative card w-full max-w-md p-6 shadow-2xl">
          <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-5">
            {{ editItem ? 'Modifier le plat' : 'Ajouter un plat' }}
          </h3>
          <form @submit.prevent="save" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nom</label>
              <input v-model="form.name" type="text" class="input" required />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Catégorie</label>
                <select v-model="form.category" class="input">
                  <option v-for="c in categories" :key="c._id" :value="c.name">{{ c.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Prix (XAF)</label>
                <input v-model="form.price" type="number" min="0" step="50" class="input" required />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea v-model="form.description" rows="2" class="input resize-none" />
            </div>
            <div class="flex items-center gap-3">
              <button type="button" @click="form.available = !form.available"
                :class="['relative w-11 h-6 rounded-full transition-colors', form.available ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600']">
                <span :class="['absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', form.available ? 'translate-x-5' : '']" />
              </button>
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ form.available ? 'Disponible' : 'Épuisé' }}</span>
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
