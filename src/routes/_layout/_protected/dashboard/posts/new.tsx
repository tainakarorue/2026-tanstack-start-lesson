import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { trpc } from '@/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute(
  '/_layout/_protected/dashboard/posts/new',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const createMutation = useMutation(
    trpc.postsRouter.create.mutationOptions({
      onSuccess: (post) => {
        queryClient.invalidateQueries({
          queryKey: [['postsRouter', 'paginated']],
        })
        toast.success('投稿を作成しました')
        router.navigate({
          to: '/dashboard/posts/$postId',
          params: { postId: post.id },
        })
      },
      onError: () => toast.error('作成に失敗しました'),
    }),
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate({ title, content })
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard/posts">← 一覧に戻る</Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold">新しい投稿を作成</h1>

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
        <div className="flex gap-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? '作成中...' : '作成する'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/dashboard/posts">キャンセル</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
