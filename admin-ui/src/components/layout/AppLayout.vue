<script setup>
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import { useSidebarStore } from '@/stores/sidebar'

const sidebar = useSidebarStore()
</script>

<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">

    <!-- Mobile overlay -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="sidebar.mobileOpen"
        class="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
        @click="sidebar.closeMobile()"
      />
    </Transition>

    <!-- Sidebar -->
    <AppSidebar />

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <AppHeader />
      <main class="flex-1 overflow-y-auto p-4 md:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
