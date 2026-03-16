import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireAuth } from '@/lib/auth-guards'

export const Route = createFileRoute('/_layout/_protected')({
  beforeLoad: () => requireAuth(),
  component: () => <Outlet />,
})
