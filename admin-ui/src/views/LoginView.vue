<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()
theme.init()

const email    = ref('')
const password = ref('')
const error    = ref('')
const loading  = ref(false)
const showPwd  = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push('/dashboard')
  } catch (e) {
    error.value = e.message || 'Identifiants incorrects. Réessayez.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
    <!-- Left panel — branding -->
    <div class="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
      style="background-image: url('/restaurant-bg.png'); background-size: cover; background-position: center;">
      <!-- Dark overlay -->
      <div class="absolute inset-0 bg-brand-900/75" />

      <div class="relative z-10">
        <div class="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="14" fill="#8b1a1a"/>
              <!-- Plate -->
              <ellipse cx="14" cy="17" rx="8" ry="3" fill="white" opacity="0.15"/>
              <ellipse cx="14" cy="17" rx="8" ry="3" fill="none" stroke="white" stroke-width="1.2" opacity="0.9"/>
              <!-- Food dome -->
              <path d="M6 17 Q6 10 14 10 Q22 10 22 17" fill="white" opacity="0.22"/>
              <path d="M6 17 Q6 10 14 10 Q22 10 22 17" fill="none" stroke="white" stroke-width="1.2" opacity="0.9"/>
              <!-- Steam lines -->
              <path d="M11 8.5 Q10.5 7 11 5.5" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
              <path d="M14 8 Q13.5 6.5 14 5" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
              <path d="M17 8.5 Q16.5 7 17 5.5" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
            </svg>
        </div>
      </div>

      <div class="relative z-10">
        <h2 class="text-4xl font-bold text-white mb-4">Bienvenue sur<br/>Restaurant Admin</h2>
        <p class="text-brand-200 text-lg">Gérez votre menu, vos commandes et vos clients depuis une interface unifiée.</p>
      </div>

      <div class="relative z-10 grid grid-cols-3 gap-4">
        <div v-for="stat in [['40+', 'Plats'], ['14', 'Commandes'], ['7', 'Outils IA']]" :key="stat[0]"
          class="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
          <p class="text-2xl font-bold text-white">{{ stat[0] }}</p>
          <p class="text-brand-200 text-sm">{{ stat[1] }}</p>
        </div>
      </div>
    </div>

    <!-- Right panel — form -->
    <div class="flex-1 flex flex-col items-center justify-center px-8 py-12">
      <!-- Theme toggle -->
      <button @click="theme.toggle()" class="absolute top-5 right-5 btn-ghost !px-2.5 !py-2.5">
        <svg v-if="theme.dark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/>
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      </button>

      <div class="w-full max-w-md">
        <div class="lg:hidden mb-8 text-center">
          <div class="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 10c0-2.21 1.79-4 4-4s4 1.79 4 4"/>
              <path d="M7 10h10v2H7z" stroke="none" fill="currentColor" opacity="0.9"/>
              <line x1="6" y1="12" x2="18" y2="12"/>
              <circle cx="12" cy="15.5" r="2"/>
              <path d="M7 24v-3.5c0-1.5 2-2.5 5-2.5s5 1 5 2.5V24"/>
              <path d="M11 18l1 2 1-2"/>
            </svg>
          </div>
          <p class="text-sm font-semibold text-brand-600 dark:text-brand-400">Restaurant Admin</p>
        </div>

        <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Connexion</h2>
        <p class="text-gray-500 dark:text-gray-400 mb-8">Accédez au tableau de bord administrateur.</p>

        <form @submit.prevent="submit" class="space-y-5">
          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
            <input v-model="email" type="email" autocomplete="email"
              placeholder="admin@restaurant.cm" class="input" required />
          </div>

          <!-- Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mot de passe</label>
            <div class="relative">
              <input v-model="password" :type="showPwd ? 'text' : 'password'"
                autocomplete="current-password" placeholder="••••••••" class="input pr-10" required />
              <button type="button" @click="showPwd = !showPwd"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="showPwd" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Error -->
          <div v-if="error" class="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <svg class="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
          </div>

          <button type="submit" :disabled="loading" class="btn-primary w-full justify-center py-3 text-base">
            <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ loading ? 'Connexion...' : 'Se connecter' }}
          </button>
        </form>

        <p class="mt-6 text-center text-xs text-gray-400 dark:text-gray-600">
          Compte par défaut : <code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">admin@restaurant.cm / admin123</code>
        </p>
      </div>
    </div>
  </div>
</template>
