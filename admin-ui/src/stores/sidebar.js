import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSidebarStore = defineStore('sidebar', () => {
  // Desktop: collapsed (icon-only) vs expanded
  const collapsed = ref(localStorage.getItem('sidebar-collapsed') === 'true')
  // Mobile: drawer open/closed
  const mobileOpen = ref(false)

  function toggleCollapse() {
    collapsed.value = !collapsed.value
    localStorage.setItem('sidebar-collapsed', collapsed.value)
  }

  function toggleMobile() {
    mobileOpen.value = !mobileOpen.value
  }

  function closeMobile() {
    mobileOpen.value = false
  }

  return { collapsed, mobileOpen, toggleCollapse, toggleMobile, closeMobile }
})
