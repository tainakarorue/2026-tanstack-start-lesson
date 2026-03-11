# 07. 05（Suspense / 無限スクロール）導入時の 04（tRPC）ファイル調整

05-suspense-infinite.md の実装を行う際に、04-trpc.md で作成したファイルに
加える変更点をまとめる。

---

## 調整が必要なファイル一覧

| ファイル | 変更内容 |
|---|---|
| `src/router.tsx` | `dehydrate` / `hydrate` オプションを追加（**SSR 必須**） |
| `src/trpc/query-client.ts` | ファイル名を kebab-case に統一（任意） |
| `src/trpc/router.ts` | `paginated` / `infinite` プロシージャを追加 |
| `src/routes/_layout/posts/index.tsx` | `useQuery` → `useSuspenseQuery`（またはページネーション・無限スクロール版）に差し替え |
| `src/routes/_layout/posts/$postId.tsx` | `useQuery` → `useSuspenseQuery`、loader のオプション生成を変更 |

---

## 1. `src/router.tsx` — SSR Hydration 設定（重要）

### なぜ必要か

```
【現状（hydration なし）】

サーバー:
  loader → queryClient.ensureQueryData() → サーバー側 queryClient にデータが入る
  React がレンダリング → HTML を返す

クライアント:
  queryClient は空のまま起動
  useSuspenseQuery がキャッシュを探す → 見つからない → 再フェッチ発生
  （またはハイドレーションミスマッチ）

【hydration あり】

サーバー:
  loader → queryClient にデータが入る
  router.dehydrate() → queryClient のキャッシュをシリアライズ → <Scripts /> で HTML に埋め込む

クライアント:
  router.hydrate() → デシリアライズして queryClient に復元
  useSuspenseQuery → キャッシュ済み → 再フェッチなし・ローディング表示なし
```

### 変更前（04 の実装）

```ts
// src/router.tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
  })
  return router
}
```

### 変更後（hydration 追加）

```ts
// src/router.tsx
import { createRouter } from '@tanstack/react-router'
import { dehydrate, hydrate } from '@tanstack/react-query'  // 追加
import { routeTree } from './routeTree.gen'
import { queryClient } from './trpc/query-client'           // 追加

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,

    // サーバー側: queryClient のキャッシュをシリアライズして HTML に埋め込む
    dehydrate: () => ({
      queryClientState: dehydrate(queryClient),
    }),

    // クライアント側: HTML から取り出してキャッシュに復元する
    hydrate: (dehydratedState) => {
      hydrate(queryClient, dehydratedState.queryClientState)
    },
  })
  return router
}
```

### `dehydrate` / `hydrate` の型宣言（TypeScript 対応）

TanStack Router は `dehydrate` の戻り値の型を `router.tsx` と `__root.tsx` の両方で
知っている必要がある。`routerContext` の型推論に含まれるため、`getRouter()` の
戻り値型が正しく推論されていれば追加の型定義は不要。

---

## 3. `src/trpc/router.ts` — プロシージャの追加

04 で定義した `posts` ルーターに `paginated` と `infinite` を追加する。

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
    // ── 04 から変更なし ──────────────────────────────────
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

    // ── 05 で追加 ────────────────────────────────────────
    // ページネーション用
    paginated: publicProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      }))
      .query(async ({ input }) => {
        const res = await fetch(
          `https://jsonplaceholder.typicode.com/posts?_page=${input.page}&_limit=${input.limit}`
        )
        const items = await res.json() as { id: number; title: string; body: string }[]
        const total = 100
        return {
          items,
          total,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil(total / input.limit),
        }
      }),

    // 無限スクロール用（カーソル = ページ番号）
    infinite: publicProcedure
      .input(z.object({
        cursor: z.number().min(1).default(1),
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
})

export type AppRouter = typeof appRouter
```

---

## 2. `src/trpc/query-client.ts` — ファイル名の不一致に注意

04-trpc.md では `queryClient.ts`（camelCase）で作成しているが、
05-suspense-infinite.md のプロジェクト構成図では `query-client.ts`（kebab-case）と表記されている。

**どちらでも動作するが、プロジェクト内で統一することが重要。**

- kebab-case に統一する場合は以下をリネームし、import パスを更新する。

```
src/trpc/queryClient.ts  →  src/trpc/query-client.ts
```

import を更新するファイル：

| ファイル | 変更前 | 変更後 |
|---|---|---|
| `src/trpc/client.ts` | `from './queryClient'` | `from './query-client'` |
| `src/routes/__root.tsx` | `from '../trpc/queryClient'` | `from '../trpc/query-client'` |
| `src/routes/_layout/posts/$postId.tsx` | `from '../../../trpc/queryClient'` | `from '../../../trpc/query-client'` |

> ファイル名はどちらかに統一されていれば問題ない。本ドキュメントでは以降 `queryClient.ts` のまま記載する。

---

## 4. `src/routes/_layout/posts/index.tsx` — useQuery → Suspense 版に差し替え

### 変更前（04 の実装）

```tsx
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

### 変更後 A：ページネーション版（useSuspenseQuery）

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Suspense } from 'react'
import { z } from 'zod'
import { trpc } from '../../../trpc/client'

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

  // data は常に定義済み（undefined チェック不要）
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

### 変更後 B：無限スクロール版（useSuspenseInfiniteQuery）

```tsx
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
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 1,
      })
    )

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

  const posts = data.pages.flatMap((page) => page.items)

  return (
    <div>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
      <div ref={bottomRef}>
        {isFetchingNextPage && <div>追加読み込み中...</div>}
        {!hasNextPage && <div>すべて読み込みました</div>}
      </div>
    </div>
  )
}
```

> A と B はどちらか一方を選択する。両方を同じルートに実装することはできない。

---

## 5. `src/routes/_layout/posts/$postId.tsx` — loader と useSuspenseQuery に変更

### 変更前（04 の実装）

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { trpc } from '../../../trpc/client'
import { queryClient } from '../../../trpc/queryClient'

export const Route = createFileRoute('/_layout/posts/$postId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      trpc.posts.byId.queryOptions({ id: Number(params.postId) })  // ← queryOptions
    ),
  component: PostPage,
})

function PostPage() {
  const { postId } = Route.useParams()
  const { data: post } = useQuery(                                  // ← useQuery
    trpc.posts.byId.queryOptions({ id: Number(postId) })
  )
  if (!post) return null                                            // ← undefined ガードが必要
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  )
}
```

### 変更後（05 の実装）

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'           // ← 変更
import { Suspense } from 'react'
import { trpc } from '../../../trpc/client'
import { queryClient } from '../../../trpc/queryClient'

export const Route = createFileRoute('/_layout/posts/$postId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      trpc.posts.byId.suspenseQueryOptions({ id: Number(params.postId) })  // ← 変更
    ),
  component: PostPage,
})

function PostPage() {
  const { postId } = Route.useParams()
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <PostDetail id={Number(postId)} />
    </Suspense>
  )
}

// data は常に定義済み → undefined ガード不要
function PostDetail({ id }: { id: number }) {
  const { data: post } = useSuspenseQuery(                         // ← 変更
    trpc.posts.byId.suspenseQueryOptions({ id })                   // ← 変更
  )
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  )
}
```

### 変更点の差分まとめ

| 箇所 | 04 の実装 | 05 の実装 |
|---|---|---|
| import | `useQuery` | `useSuspenseQuery` + `Suspense` |
| `loader` のオプション生成 | `queryOptions()` | `suspenseQueryOptions()` |
| データ取得フック | `useQuery(trpc.posts.byId.queryOptions(...))` | `useSuspenseQuery(trpc.posts.byId.suspenseQueryOptions(...))` |
| undefined ガード | `if (!post) return null` が必要 | 不要（`data` は常に定義済み） |
| ローディング UI | `isLoading` で自分で制御 | `<Suspense fallback>` に委譲 |

---

## まとめ

```
04-trpc.md の実装から 05-suspense-infinite.md の実装に移行する際の変更箇所

src/router.tsx  ★ SSR を使う場合は必須
  └── dehydrate: () => ({ queryClientState: dehydrate(queryClient) })  を追加
  └── hydrate: (state) => hydrate(queryClient, state.queryClientState) を追加
  └── import: @tanstack/react-query の dehydrate / hydrate と query-client を追加

src/trpc/router.ts
  └── posts.paginated / posts.infinite プロシージャを追加

src/routes/_layout/posts/index.tsx
  └── useQuery → useSuspenseQuery（またはuseSuspenseInfiniteQuery）に差し替え
       ※ posts.list ではなく posts.paginated / posts.infinite を使用する

src/routes/_layout/posts/$postId.tsx
  └── useQuery → useSuspenseQuery に差し替え
  └── loader の queryOptions() → suspenseQueryOptions() に変更
  └── Suspense コンポーネントでラップ
  └── undefined ガード（if (!post)）を削除
```

### SSR あり・なしの動作比較

| | hydration なし | hydration あり |
|---|---|---|
| loader のプリフェッチ | サーバーのみで完結、クライアントに引き継がれない | `dehydrate` でシリアライズ → クライアントに渡る |
| クライアント初回レンダリング | queryClient が空 → 再フェッチ発生 | queryClient に復元済み → 再フェッチなし |
| `<Suspense fallback>` の表示 | ローディングが一瞬表示される可能性がある | キャッシュ済みのためほぼ表示されない |
| 対象 | クライアントサイドのみの SPA 的な用途 | TanStack Start の SSR を活用する場合 |
