import { Suspense, useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'

import { trpc } from '@/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute(
  '/_layout/_protected/dashboard/posts/$postId',
)({
  component: RouteComponent,
})

function PostDetail() {
  const { postId } = Route.useParams()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: post } = useSuspenseQuery(
    trpc.postsRouter.byId.queryOptions({ id: postId }),
  )

  const [title, setTitle] = useState(post.title)
  const [content, setContent] = useState(post.content)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const updateMutation = useMutation(
    trpc.postsRouter.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [['postsRouter', 'paginated']],
        })
        queryClient.invalidateQueries({
          queryKey: [['postsRouter', 'byId', { id: postId }]],
        })
        toast.success('投稿を更新しました')
      },
      onError: () => toast.error('更新に失敗しました'),
    }),
  )

  const deleteMutation = useMutation(
    trpc.postsRouter.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [['postsRouter', 'paginated']],
        })
        toast.success('投稿を削除しました')
        router.navigate({ to: '/dashboard/posts' })
      },
      onError: () => toast.error('削除に失敗しました'),
    }),
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate({ id: postId, title, content })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard/posts">← 一覧に戻る</Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">投稿の編集</h1>
        <p className="text-muted-foreground text-sm">ID: {postId}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="title">タイトル</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={1}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="content">本文</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            minLength={1}
            rows={8}
          />
        </div>
        <div className="flex justify-start">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? '更新中...' : '更新する'}
          </Button>
        </div>
      </form>

      <Separator />

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-destructive">危険な操作</h2>
        <p className="text-muted-foreground text-sm">
          投稿を削除すると元に戻せません。
        </p>
        <Button
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
          disabled={deleteMutation.isPending}
        >
          この投稿を削除する
        </Button>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>投稿を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{post.title}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ id: postId })}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? '削除中...' : '削除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function PostDetailSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      <Skeleton className="h-8 w-24" />
      <div className="space-y-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

function RouteComponent() {
  return (
    <div className="p-6">
      <Suspense fallback={<PostDetailSkeleton />}>
        <PostDetail />
      </Suspense>
    </div>
  )
}
