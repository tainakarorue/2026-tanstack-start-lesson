import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/_protected/protected')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_layout/_protected/protected"!</div>
}
