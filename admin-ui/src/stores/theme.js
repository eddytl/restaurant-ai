import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const dark = ref(false)

  function init() {
    const saved = localStorage.getItem('admin-theme')
    dark.value = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    apply()
  }

  function toggle() {
    dark.value = !dark.value
    localStorage.setItem('admin-theme', dark.value ? 'dark' : 'light')
    apply()
  }

  function apply() {
    document.documentElement.classList.toggle('dark', dark.value)
  }

  return { dark, init, toggle }
})
