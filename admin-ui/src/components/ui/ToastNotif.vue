<script setup>
import { ref } from 'vue'

const toasts = ref([])
let seq = 0

function add(message, type = 'success', duration = 3500) {
  const id = ++seq
  toasts.value.push({ id, message, type })
  setTimeout(() => remove(id), duration)
}

function remove(id) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

defineExpose({ add })
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 w-80">
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-2 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div v-for="t in toasts" :key="t.id"
          :class="['flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm font-medium cursor-pointer',
            t.type === 'success' ? 'bg-white dark:bg-gray-900 border-green-200 dark:border-green-800 text-gray-800 dark:text-gray-200'
            : t.type === 'error'  ? 'bg-white dark:bg-gray-900 border-red-200 dark:border-red-800 text-gray-800 dark:text-gray-200'
            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200']"
          @click="remove(t.id)">
          <!-- Icon -->
          <div :class="['mt-0.5 shrink-0', t.type === 'success' ? 'text-green-500' : t.type === 'error' ? 'text-red-500' : 'text-blue-500']">
            <svg v-if="t.type === 'success'" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <svg v-else-if="t.type === 'error'" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
            </svg>
          </div>
          <span class="flex-1 leading-snug">{{ t.message }}</span>
          <button @click.stop="remove(t.id)" class="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 shrink-0">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
