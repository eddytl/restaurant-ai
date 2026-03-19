import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
      { path: 'menu', name: 'menu', component: () => import('@/views/MenuView.vue') },
      { path: 'orders', name: 'orders', component: () => import('@/views/OrdersView.vue') },
      { path: 'customers', name: 'customers', component: () => import('@/views/CustomersView.vue') },
      { path: 'conversations', name: 'conversations', component: () => import('@/views/ConversationsView.vue'), meta: { adminOnly: true } },
      { path: 'branches', name: 'branches', component: () => import('@/views/BranchesView.vue'), meta: { adminOnly: true } },
      { path: 'users', name: 'users', component: () => import('@/views/UsersView.vue'), meta: { adminOnly: true } },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) return { name: 'login' }
  if (to.name === 'login' && auth.isAuthenticated) return { name: 'dashboard' }
  if (to.meta.adminOnly && auth.user?.role !== 'admin') return { name: 'dashboard' }
})

export default router
