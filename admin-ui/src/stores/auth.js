import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin-token') || null)
  const user  = ref(JSON.parse(localStorage.getItem('admin-user') || 'null'))

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Erreur de connexion')
    token.value = data.data.token
    user.value  = data.data.user
    localStorage.setItem('admin-token', token.value)
    localStorage.setItem('admin-user',  JSON.stringify(user.value))
  }

  function logout() {
    token.value = null
    user.value  = null
    localStorage.removeItem('admin-token')
    localStorage.removeItem('admin-user')
  }

  return { token, user, isAuthenticated, isAdmin, login, logout }
})
