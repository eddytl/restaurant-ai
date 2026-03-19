<script setup>
defineProps({
  open:    { type: Boolean, default: false },
  title:   { type: String,  default: 'Confirmer' },
  message: { type: String,  default: '' },
  confirmLabel: { type: String, default: 'Confirmer' },
  cancelLabel:  { type: String, default: 'Annuler' },
  danger:  { type: Boolean, default: true },
  loading: { type: Boolean, default: false },
})
defineEmits(['confirm', 'cancel'])
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('cancel')" />

        <!-- Panel -->
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div v-if="open" class="relative card w-full max-w-sm p-6 shadow-2xl">
            <!-- Icon + title row -->
            <div class="flex items-center gap-3 mb-3">
              <div :class="['w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-brand-50 dark:bg-brand-900/20']">
                <svg v-if="danger" class="w-5 h-5 text-red-500"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <svg v-else class="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 class="text-base font-bold text-gray-900 dark:text-gray-100">{{ title }}</h3>
            </div>

            <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">{{ message }}</p>

            <div class="flex gap-3">
              <button @click="$emit('cancel')" :disabled="loading" class="btn-ghost flex-1 justify-center">
                {{ cancelLabel }}
              </button>
              <button @click="$emit('confirm')" :disabled="loading"
                :class="['flex-1 justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
                  danger
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-brand-600 hover:bg-brand-700 text-white']">
                <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ loading ? 'En cours…' : confirmLabel }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
