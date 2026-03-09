import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Navigation } from '../components/navigation'

export const Route = createFileRoute('/_layout')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <Navigation />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
