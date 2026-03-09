import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/posts/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/posts/"!</div>
}
