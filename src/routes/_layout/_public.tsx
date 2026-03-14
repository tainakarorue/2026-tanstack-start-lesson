import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireGuest } from '@/lib/auth.server'

export const Route = createFileRoute('/_layout/_public')({
  beforeLoad: requireGuest,
  component: () => <Outlet />,
})
