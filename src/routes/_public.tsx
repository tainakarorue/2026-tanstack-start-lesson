import { createFileRoute } from '@tanstack/react-router'

import { requireGuest } from '@/lib/auth.server'

export const Route = createFileRoute('/_public')({
  beforeLoad: requireGuest,
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_public"!</div>
}
