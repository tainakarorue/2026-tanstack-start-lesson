import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { trpc } from '@/trpc/client'

export const Route = createFileRoute('/_layout/posts/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: posts, isLoading } = useQuery(trpc.posts.list.queryOptions())

  if (isLoading) return <div>読み込み中...</div>

  return (
    <div>
      <h2>Hello "/posts/"!</h2>
      <ul>
        {posts?.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  )
}
