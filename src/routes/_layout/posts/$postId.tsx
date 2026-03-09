import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/posts/$postId')({
  component: RouteComponent,
})

function RouteComponent() {
  const {postId} = Route.useParams()
  return <div>ID: {postId}</div>
}
