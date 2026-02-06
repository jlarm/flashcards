import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'auth',
      component: () => import('@/views/AuthView.vue'),
    },
    {
      path: '/app',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/deck/:id',
      name: 'deck',
      component: () => import('@/views/DeckView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/study/:id',
      name: 'study',
      component: () => import('@/views/StudyView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  if (authStore.isLoading) {
    await authStore.init()
  }
  if (to.meta.requiresAuth && !authStore.user) {
    return { name: 'auth' }
  }
  if (to.name === 'auth' && authStore.user) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
