import { Suspense } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { zodValidator } from '@tanstack/zod-adapter'
import { z } from 'zod'

import { trpc } from '@/trpc/client'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

const searchSchema = z.object({
  page: z.number().min(1).default(1),
})

export const Route = createFileRoute('/_layout/_protected/dashboard/posts/')({
  validateSearch: zodValidator(searchSchema),
  component: RouteComponent,
})

const LIMIT = 10

function PostsTable() {
  const { page } = Route.useSearch()
  const navigate = Route.useNavigate()

  const { data } = useSuspenseQuery(
    trpc.postsRouter.paginated.queryOptions({ page, limit: LIMIT }),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">投稿管理</h1>
          <p className="text-muted-foreground text-sm">全 {data.total} 件</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/posts/new">+ 新規作成</Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">タイトル</TableHead>
              <TableHead>本文（抜粋）</TableHead>
              <TableHead className="w-[160px]">作成日時</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-muted-foreground text-center"
                >
                  投稿がありません
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((post) => (
                <TableRow
                  key={post.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    navigate({
                      to: '/dashboard/posts/$postId',
                      params: { postId: post.id },
                    })
                  }
                >
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-xs">
                    {post.content.slice(0, 80)}
                    {post.content.length > 80 ? '...' : ''}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(post.createdAt).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => navigate({ search: { page: page - 1 } })}
          >
            前へ
          </Button>
          <span className="text-sm">
            {page} / {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => navigate({ search: { page: page + 1 } })}
          >
            次へ
          </Button>
        </div>
      )}
    </div>
  )
}

function PostsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>本文（抜粋）</TableHead>
              <TableHead>作成日時</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-64" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function RouteComponent() {
  return (
    <div className="p-6">
      <Suspense fallback={<PostsTableSkeleton />}>
        <PostsTable />
      </Suspense>
    </div>
  )
}
