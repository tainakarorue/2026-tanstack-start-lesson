# 04. tRPC セットアップ

TanStack Start に tRPC v11 + TanStack Query v5 を導入する手順。

---

## 1. パッケージのインストール

```bash
npm install @trpc/server @trpc/client @trpc/tanstack-react-query @tanstack/react-query zod
```

---

## 2. ファイル構成

```
src/
  trpc/
    router.ts        ← tRPC ルーター定義
    init.ts          ← tRPC インスタンス初期化
    client.ts        ← クライアント設定
    queryClient.ts   ← QueryClient シングルトン
  routes/
    api/
      trpc.$.ts      ← tRPC の HTTP エンドポイント (catch-all)
    __root.tsx        ← QueryClientProvider を追加
```

---

## 3. tRPC インスタンスの初期化

```ts
// src/trpc/init.ts
import { initTRPC } from '@trpc/server'

const t = initTRPC.create()

export const router = t.router
export const publicProcedure = t.procedure
```

---

## 4. ルーターの定義

```ts
// src/trpc/router.ts
import { z } from 'zod'
import { router, publicProcedure } from './init'

export const appRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return { message: `Hello, ${input.name ?? 'World'}!` }
    }),

  posts: router({
    list: publicProcedure.query(async () => {
      const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=10')
      return res.json() as Promise<{ id: number; title: string; body: string }[]>
    }),

    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${input.id}`)
        return res.json() as Promise<{ id: number; title: string; body: string }>
      }),

    create: publicProcedure
      .input(z.object({ title: z.string(), body: z.string() }))
      .mutation(async ({ input }) => {
        const res = await fetch('https://jsonplaceholder.typicode.com/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        return res.json() as Promise<{ id: number; title: string; body: string }>
      }),
  }),
})

// クライアントで型を使うためにエクスポート
export type AppRouter = typeof appRouter
```

---

## 5. API エンドポイントの作成

TanStack Start の API ルートで tRPC リクエストを受け取る。
`trpc.$` はスプラットルートで `/api/trpc/*` のすべてのパスを処理する。

```ts
// src/routes/api/trpc.$.ts
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '../../trpc/router'

function handleRequest(request: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: () => ({}),
  })
}

export const APIRoute = createAPIFileRoute('/api/trpc/$')({
  GET: ({ request }) => handleRequest(request),
  POST: ({ request }) => handleRequest(request),
})
```

---

## 6. QueryClient のシングルトン

```ts
// src/trpc/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1分
    },
  },
})
```

---

## 7. tRPC クライアントの作成

```ts
// src/trpc/client.ts
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import type { AppRouter } from './router'
import { queryClient } from './queryClient'

const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
    }),
  ],
})

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client,
  queryClient,
})
```

---

## 8. `__root.tsx` に QueryClientProvider を追加

```tsx
// src/routes/__root.tsx
import { createRootRoute, Outlet, ScrollRestoration } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../trpc/queryClient'
import '../app.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <ScrollRestoration />
      <Outlet />
    </QueryClientProvider>
  )
}
```

---

## 9. コンポーネントでの使い方

### クエリ (データ取得)

```tsx
// src/routes/_layout/posts/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { trpc } from '../../../trpc/client'

export const Route = createFileRoute('/_layout/posts/')({
  component: PostsPage,
})

function PostsPage() {
  const { data: posts, isLoading } = useQuery(trpc.posts.list.queryOptions())

  if (isLoading) return <div>読み込み中...</div>

  return (
    <ul>
      {posts?.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

### ミューテーション (データ更新)

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../../../trpc/client'

function CreatePostForm() {
  const qc = useQueryClient()

  const { mutate, isPending } = useMutation(
    trpc.posts.create.mutationOptions({
      onSuccess: () => {
        // 投稿一覧キャッシュを無効化して再取得
        qc.invalidateQueries({ queryKey: trpc.posts.list.queryKey() })
      },
    })
  )

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    mutate({
      title: (form.elements.namedItem('title') as HTMLInputElement).value,
      body: (form.elements.namedItem('body') as HTMLTextAreaElement).value,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="タイトル" required />
      <textarea name="body" placeholder="本文" required />
      <button type="submit" disabled={isPending}>
        {isPending ? '送信中...' : '投稿'}
      </button>
    </form>
  )
}
```

### loader と組み合わせて SSR 対応

```tsx
// src/routes/_layout/posts/$postId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { trpc } from '../../../trpc/client'
import { queryClient } from '../../../trpc/queryClient'

export const Route = createFileRoute('/_layout/posts/$postId')({
  loader: ({ params }) => {
    // サーバー側でデータをプリフェッチしてキャッシュに載せる
    return queryClient.ensureQueryData(
      trpc.posts.byId.queryOptions({ id: Number(params.postId) })
    )
  },
  component: PostPage,
})

function PostPage() {
  const { postId } = Route.useParams()

  // loader でプリフェッチ済みなので即座に表示される
  const { data: post } = useQuery(
    trpc.posts.byId.queryOptions({ id: Number(postId) })
  )

  if (!post) return null

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  )
}
```

---

## まとめ：データフローの全体像

```
コンポーネント
  └── useQuery(trpc.posts.list.queryOptions())
        └── TanStack Query (キャッシュ管理)
              └── tRPC クライアント (httpBatchLink)
                    └── HTTP POST /api/trpc/posts.list
                          └── src/routes/api/trpc.$.ts (APIRoute)
                                └── tRPC ルーター (appRouter)
                                      └── posts.list ハンドラー
```

| ファイル | 役割 |
|---|---|
| `src/trpc/init.ts` | tRPC インスタンス・プロシージャの基盤 |
| `src/trpc/router.ts` | API エンドポイントの定義 |
| `src/trpc/queryClient.ts` | TanStack Query のキャッシュ管理 |
| `src/trpc/client.ts` | クライアントから tRPC を呼び出すためのプロキシ |
| `src/routes/api/trpc.$.ts` | HTTP リクエストを tRPC ルーターに渡すアダプター |
