import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from './stores/auth'
import type { Role } from './types'
export const homeFor = (role?: Role) =>
  role === 'ADMIN'
    ? '/staff/dashboard'
    : role === 'CONTOIRISTE'
      ? '/staff/kitchen'
      : '/staff/tickets'
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/staff' },
    { path: '/staff/login', component: () => import('./views/LoginView.vue') },
    {
      path: '/staff',
      component: () => import('./components/StaffLayout.vue'),
      meta: { auth: true },
      children: [
        { path: '', redirect: () => homeFor(useAuth().user?.role) },
        {
          path: 'dashboard',
          component: () => import('./views/DashboardView.vue'),
          meta: { roles: ['ADMIN'] },
        },
        { path: 'tickets', component: () => import('./views/TicketsView.vue') },
        { path: 'tickets/:id', component: () => import('./views/TicketView.vue') },
        {
          path: 'kitchen',
          component: () => import('./views/TicketsView.vue'),
          meta: { roles: ['ADMIN', 'CONTOIRISTE'] },
        },
        { path: 'tables', component: () => import('./views/TablesView.vue') },
        {
          path: 'availability',
          component: () => import('./views/AvailabilityView.vue'),
          meta: { roles: ['ADMIN', 'CONTOIRISTE'] },
        },
        ...(['users', 'categories', 'products'] as const).map((resource) => ({
          path: resource,
          component: () => import('./views/ResourceView.vue'),
          props: { resource },
          meta: { roles: ['ADMIN'] },
        })),
      ],
    },
    { path: '/:pathMatch(.*)*', component: () => import('./views/NotFoundView.vue') },
  ],
})
router.beforeEach(async (to) => {
  const auth = useAuth()
  await auth.restore()
  if (to.meta.auth && !auth.user) return '/staff/login'
  const roles = to.meta.roles as Role[] | undefined
  if (roles && auth.user && !roles.includes(auth.user.role)) return homeFor(auth.user.role)
  if (to.path === '/staff/login' && auth.user) return homeFor(auth.user.role)
})
