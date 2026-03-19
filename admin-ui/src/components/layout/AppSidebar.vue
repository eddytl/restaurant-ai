<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useSidebarStore } from '@/stores/sidebar'
import SidebarContent from './SidebarContent.vue'

const route  = useRoute()
const router = useRouter()
const auth    = useAuthStore()
const sidebar = useSidebarStore()
const { t }   = useI18n()

const navItems = computed(() => [
  { name: t('nav.dashboard'),     to: '/dashboard',     icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { name: t('nav.menu'),          to: '/menu',          icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { name: t('nav.orders'),        to: '/orders',        icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { name: t('nav.customers'),     to: '/customers',     icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  ...(auth.isAdmin ? [
    { name: t('nav.conversations'), to: '/conversations', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { name: t('nav.branches'), to: '/branches', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { name: t('nav.users'),    to: '/users',    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  ] : []),
])

function isActive(to) { return route.path.startsWith(to) }

function navigate(to) {
  router.push(to)
  sidebar.closeMobile()
}

function doLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <!--
    Desktop: always visible, width toggles between w-64 (expanded) and w-16 (collapsed)
    Mobile:  off-canvas drawer (fixed, z-30), slides in when mobileOpen = true
  -->
  <aside
    :class="[
      'flex flex-col shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 transition-all duration-200 ease-in-out',
      // Desktop width
      'hidden lg:flex',
      sidebar.collapsed ? 'lg:w-16' : 'lg:w-64',
    ]"
  >
    <SidebarContent
      :collapsed="sidebar.collapsed"
      :nav-items="navItems"
      :is-active="isActive"
      :user="auth.user"
      @navigate="navigate"
      @toggle-collapse="sidebar.toggleCollapse()"
      @logout="doLogout"
    />
  </aside>

  <!-- Mobile drawer -->
  <Transition
    enter-active-class="transition-transform duration-200 ease-out"
    enter-from-class="-translate-x-full"
    enter-to-class="translate-x-0"
    leave-active-class="transition-transform duration-200 ease-in"
    leave-from-class="translate-x-0"
    leave-to-class="-translate-x-full"
  >
    <aside
      v-if="sidebar.mobileOpen"
      class="fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 lg:hidden"
    >
      <SidebarContent
        :collapsed="false"
        :nav-items="navItems"
        :is-active="isActive"
        :user="auth.user"
        @navigate="navigate"
        @toggle-collapse="sidebar.closeMobile()"
        @logout="doLogout"
        mobile
      />
    </aside>
  </Transition>
</template>

<!-- ─── Inner component ────────────────────────────────────────────────────── -->
<script>
// Defined as a local component to avoid prop-drilling across separate files
export default { name: 'AppSidebar' }
</script>
