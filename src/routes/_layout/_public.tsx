import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireGuest } from '@/lib/auth-guards'

export const Route = createFileRoute('/_layout/_public')({
  beforeLoad: () => requireGuest(),
  component: () => <Outlet />,
})
