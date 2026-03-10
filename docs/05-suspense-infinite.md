# 05. useSuspenseQuery / useSuspenseInfiniteQuery・ページネーション・無限スクロール

---

## 現状のプロジェクト構成（04 実装後）

```
src/
  trpc/
    init.ts           ← tRPC インスタンス
    router.ts         ← appRouter 定義
    client.ts         ← trpc プロキシ
    query-client.ts   ← QueryClient シングルトン（※ファイル名は kebab-case）
  routes/
    __root.tsx        ← QueryClientProvider 設置済み
    api/
      trpc.$.ts       ← tRPC HTTP エンドポイント（server.handlers 形式）
    _layout/
      posts/
        index.tsx     ← 一覧（未実装）
        $postId.tsx   ← 詳細（未実装）
```

---

## 1. `useQuery` vs `useSuspenseQuery` の違い

| | `useQuery` | `useSuspenseQuery` |
|---|---|---|
| ローディング状態 | `isLoading` で自分で制御 | `<Suspense fallback>` に委譲 |
| エラー状態 | `isError` で自分で制御 | `<ErrorBoundary>` に委譲 |
| データの型 | `data` が `undefined` になりうる | `data` が常に定義済み |
| コード量 | 多い | 少ない（ガード不要） |

`useSuspenseQuery` を使うと `data` が必ず存在するため、`if (!data)` ガードが不要になる。

---

## 2. `useSuspenseQuery` の基本

### オプション生成

`createTRPCOptionsProxy` で生成した `trpc` オブジェクトは、
`queryOptions()` の他に `suspenseQueryOptions()` も提供する。

```ts
// useQuery 用
trpc.posts.byId.queryOptions({ id: 1 })

// useSuspenseQuery 用
trpc.posts.byId.suspenseQueryOptions({ id: 1 })
```

### コンポーネント実装

```tsx
// src/routes/_layout/posts/$postId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Suspense } from 'react'
import { trpc } from '../../../trpc/client'

export const Route = createFileRoute('/_layout/posts/$postId')({
  component: PostPage,
})

function PostPage() {
  const { postId } = Route.useParams()
  return (
    // Suspense がローディング UI を担当
    <Suspense fallback={<div>読み込み中...</div>}>
      <PostDetail id={Number(postId)} />
    </Suspense>
  )
}

// data は常に定義済み → undefined チェック不要
function PostDetail({ id }: { id: number }) {
  const { data: post } = useSuspenseQuery(
    trpc.posts.byId.suspenseQueryOptions({ id })
  )

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  )
}
```

### loader との組み合わせ（SSR プリフェッチ）

```tsx
export const Route = createFileRoute('/_layout/posts/$postId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      trpc.posts.byId.suspenseQueryOptions({ id: Number(params.postId) })
    ),
  component: PostPage,
})
```

`loader` でプリフェッチすると、クライアント到達時にはキャッシュ済みのため
`<Suspense>` の fallback がほぼ表示されない。

---

## 3. ページネーション

### 3-1. tRPC ルーターに paginated プロシージャを追加

JSONPlaceholder は `_page` / `_limit` クエリパラメータをサポートしている。

```ts
// src/trpc/router.ts
import { z } from 'zod'
import { router, publicProcedure } from './init'

export const appRouter = router({
  // ... 既存の hello, posts.byId, posts.create ...

  posts: router({
    // 既存
    list: publicProcedure.query(async () => { /* ... */ }),
    byId: publicProcedure.input(/* ... */).query(async ({ input }) => { /* ... */ }),
    create: publicProcedure.input(/* ... */).mutation(async ({ input }) => { /* ... */ }),

    // 追加: ページネーション用
    paginated: publicProcedure
      .input(z.object({ page: z.number().min(1).default(1), limit: z.number().min(1).max(100).default(10) }))
      .query(async ({ input }) => {
        const res = await fetch(
          `https://jsonplaceholder.typicode.com/posts?_page=${input.page}&_limit=${input.limit}`
        )
        const items = await res.json() as { id: number; title: string; body: string }[]
        // JSONPlaceholder の総件数は 100
        const total = 100
        return {
          items,
          total,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil(total / input.limit),
        }
      }),
  }),
})

export type AppRouter = typeof appRouter
```

### 3-2. URL 検索パラメータでページ管理

TanStack Router の `searchParams` でページ番号を URL に持たせると、
ブラウザバックや共有リンクでページが復元される。

```tsx
// src/routes/_layout/posts/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Suspense } from 'react'
import { z } from 'zod'
import { trpc } from '../../../trpc/client'

// 検索パラメータのスキーマ
const searchSchema = z.object({
  page: z.number().min(1).catch(1),
})

export const Route = createFileRoute('/_layout/posts/')({
  validateSearch: searchSchema,
  component: PostsPage,
})

function PostsPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <PostsList />
    </Suspense>
  )
}

function PostsList() {
  const { page } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const { data } = useSuspenseQuery(
    trpc.posts.paginated.suspenseQueryOptions({ page, limit: 10 })
  )

  return (
    <div>
      <ul>
        {data.items.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>

      {/* ページネーション UI */}
      <div>
        <button
          disabled={page <= 1}
          onClick={() => navigate({ search: { page: page - 1 } })}
        >
          前へ
        </button>

        <span>{page} / {data.totalPages}</span>

        <button
          disabled={page >= data.totalPages}
          onClick={() => navigate({ search: { page: page + 1 } })}
        >
          次へ
        </button>
      </div>
    </div>
  )
}
```

---

## 4. 無限スクロール

### 4-1. tRPC ルーターにカーソルベースプロシージャを追加

```ts
// src/trpc/router.ts（追加分）
posts: router({
  // ...既存...

  // 追加: 無限スクロール用（カーソル = ページ番号）
  infinite: publicProcedure
    .input(z.object({
      cursor: z.number().min(1).default(1), // 次に取得するページ番号
      limit: z.number().min(1).max(100).default(10),
    }))
    .query(async ({ input }) => {
      const res = await fetch(
        `https://jsonplaceholder.typicode.com/posts?_page=${input.cursor}&_limit=${input.limit}`
      )
      const items = await res.json() as { id: number; title: string; body: string }[]
      const nextCursor = items.length === input.limit ? input.cursor + 1 : undefined
      return { items, nextCursor }
    }),
}),
```

### 4-2. `useSuspenseInfiniteQuery` で無限スクロール実装

```tsx
// src/routes/_layout/posts/index.tsx（無限スクロール版）
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { Suspense, useEffect, useRef } from 'react'
import { trpc } from '../../../trpc/client'

export const Route = createFileRoute('/_layout/posts/')({
  component: PostsPage,
})

function PostsPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <PostsInfiniteList />
    </Suspense>
  )
}

function PostsInfiniteList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.posts.infinite.suspenseInfiniteQueryOptions({
        limit: 10,
        // 次ページのカーソルを返す関数（必須）
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 1,
      })
    )

  // IntersectionObserver で末尾要素を監視
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = bottomRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // pages は各ページのレスポンスの配列
  const posts = data.pages.flatMap((page) => page.items)

  return (
    <div>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>

      {/* 監視対象の末尾要素 */}
      <div ref={bottomRef}>
        {isFetchingNextPage && <div>追加読み込み中...</div>}
        {!hasNextPage && <div>すべて読み込みました</div>}
      </div>
    </div>
  )
}
```

### `useInfiniteQuery`（非 Suspense）版との比較

```ts
// Suspense 版（data は常に定義済み）
const { data } = useSuspenseInfiniteQuery(
  trpc.posts.infinite.suspenseInfiniteQueryOptions({ ... })
)

// 非 Suspense 版（isLoading を自分で処理）
const { data, isLoading } = useInfiniteQuery(
  trpc.posts.infinite.infiniteQueryOptions({ ... })
)
```

---

## 5. オプション生成メソッド一覧

| メソッド | 対応フック | 用途 |
|---|---|---|
| `trpc.x.queryOptions()` | `useQuery` | 通常のデータ取得 |
| `trpc.x.suspenseQueryOptions()` | `useSuspenseQuery` | Suspense 対応のデータ取得 |
| `trpc.x.infiniteQueryOptions()` | `useInfiniteQuery` | 無限スクロール |
| `trpc.x.suspenseInfiniteQueryOptions()` | `useSuspenseInfiniteQuery` | Suspense 対応の無限スクロール |
| `trpc.x.mutationOptions()` | `useMutation` | データ更新 |

---

## 6. まとめ：選択指針

```
データ取得が必要
├── 単一データ or 固定リスト
│   ├── ローディング UI を自分で制御したい → useQuery
│   └── Suspense に委譲したい            → useSuspenseQuery ✅
│
└── リスト + 追加読み込みが必要
    ├── ページネーション（URL でページ管理） → useSuspenseQuery + validateSearch
    └── 無限スクロール
        ├── ローディング UI を自分で制御したい → useInfiniteQuery
        └── Suspense に委譲したい            → useSuspenseInfiniteQuery ✅
```

`useSuspenseQuery` / `useSuspenseInfiniteQuery` を使う場合は必ず
コンポーネントツリーの上位に `<Suspense fallback={...}>` を置くこと。
