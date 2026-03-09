import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/posts')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>
    <h1>Posts Pages</h1>
    <Outlet />
  </div>
}
