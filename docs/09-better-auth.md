# 09. Better Auth セットアップ

TanStack Start に Better Auth を導入する手順。
schema（user / session / account / verification）と `.env` は 08 で設定済み。

---

## Next.js との比較

| 項目 | Next.js | TanStack Start |
|---|---|---|
| パッケージ | 同じ | 同じ |
| `src/lib/auth.ts` | 同じ | 同じ |
| `src/lib/auth-client.ts` | 同じ | 同じ |
| API ハンドラー | `app/api/auth/[...all]/route.ts` | `src/routes/api/auth.$.ts`（`server.handlers` 形式） |
| セッション取得（サーバー） | Server Component で `auth.api.getSession()` | `loader` / `beforeLoad` で `getWebRequest()` 経由 |
| ルート保護 | middleware.ts | `beforeLoad` |
| tRPC との連携 | Route Handler で context 生成 | `trpc.$.ts` の `createContext` で生成 |

---

## 1. パッケージのインストール

```bash
npm install better-auth
```

---

## 2. ファイル構成

```
src/
  lib/
    auth.ts          ← Better Auth サーバーインスタンス
    auth-client.ts   ← Better Auth クライアント
  trpc/
    init.ts          ← context に session を追加（変更あり）
  routes/
    api/
      auth.$.ts      ← Better Auth の HTTP エンドポイント（新規）
      trpc.$.ts      ← createContext を渡す（変更あり）
```

---

## 3. `src/lib/auth.ts` — サーバーインスタンス（Next.js と同じ）

```ts
// src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../db'
import * as schema from '../db/schema'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
  },
})
```

---

## 4. `src/routes/api/auth.$.ts` — API ハンドラー（TanStack Start 固有）

Next.js では `app/api/auth/[...all]/route.ts` だが、
TanStack Start では `createFileRoute` + `server.handlers` 形式で書く。
（04 の tRPC エンドポイントと同じパターン）

```ts
// src/routes/api/auth.$.ts
import { createFileRoute } from '@tanstack/react-router'
import { auth } from '../../lib/auth'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
})
```

これにより `/api/auth/*` のすべてのパスを Better Auth が処理する。

---

## 5. `src/lib/auth-client.ts` — クライアント（Next.js と同じ）

```ts
// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: 'http://localhost:3000', // 本番では環境変数で切り替える
})

export const { signIn, signUp, signOut, useSession } = authClient
```

> **補足:** クライアントコードで環境変数を使う場合は `VITE_` プレフィックスが必要。
> ただし `baseURL` は同一オリジンなら省略可能。

---

## 6. セッション取得（TanStack Start 固有）

Next.js の Server Component では `headers()` を使うが、
TanStack Start では `getWebRequest()` でリクエストオブジェクトを取得する。

```ts
import { getWebRequest } from '@tanstack/react-start/server'
import { auth } from '../lib/auth'

// loader や beforeLoad の中で使う
const request = getWebRequest()
const session = await auth.api.getSession({ headers: request.headers })
```

---

## 7. ルート保護（TanStack Start 固有）

Next.js の `middleware.ts` に相当する機能はない。
代わりに各ルートの `beforeLoad` でセッションを確認する。

```ts
// src/routes/dashboard.tsx（例）
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getWebRequest } from '@tanstack/react-start/server'
import { auth } from '../lib/auth'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const request = getWebRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw redirect({ to: '/login' })
    }

    // session を後続の loader / component に渡す
    return { session }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { session } = Route.useRouteContext()
  return <div>ようこそ、{session.user.name} さん</div>
}
```

### 複数ルートをまとめて保護する場合

レイアウトルート（`_layout.tsx` など）の `beforeLoad` に書くと
配下のすべてのルートに適用される。

```ts
// src/routes/_auth.tsx（認証済みユーザー専用レイアウト）
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { getWebRequest } from '@tanstack/react-start/server'
import { auth } from '../lib/auth'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    const request = getWebRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw redirect({ to: '/login' })
    return { session }
  },
  component: () => <Outlet />,
})
```

---

## 8. tRPC との連携（TanStack Start 固有）

tRPC プロシージャ内でセッション情報を使いたい場合は、
`createContext` でセッションを取得して context に載せる。

### `src/trpc/init.ts` — context にセッションを追加

```ts
// src/trpc/init.ts
import { initTRPC, TRPCError } from '@trpc/server'
import { auth } from '../lib/auth'

// リクエストから context を生成
export const createContext = async (req: Request) => {
  const session = await auth.api.getSession({ headers: req.headers })
  return { session }
}

type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create()

export const router = t.router

// 認証不要のプロシージャ
export const publicProcedure = t.procedure

// 認証必須のプロシージャ（未ログインなら UNAUTHORIZED エラー）
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { session: ctx.session } })
})
```

### `src/routes/api/trpc.$.ts` — createContext を渡す

```ts
// src/routes/api/trpc.$.ts
import { createFileRoute } from '@tanstack/react-router'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '../../trpc/router'
import { createContext } from '../../trpc/init'

function handleRequest(request: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: ({ req }) => createContext(req), // ← 追加
  })
}

export const Route = createFileRoute('/api/trpc/$')({
  server: {
    handlers: {
      GET: ({ request }) => handleRequest(request),
      POST: ({ request }) => handleRequest(request),
    },
  },
})
```

### `src/trpc/router.ts` — protectedProcedure の使い方

```ts
// src/trpc/router.ts
import { router, publicProcedure, protectedProcedure } from './init'
import { db } from '../db'
import { posts } from '../db/schema'
import { eq } from 'drizzle-orm'

export const appRouter = router({
  posts: router({
    // 誰でも閲覧可能
    list: publicProcedure.query(() =>
      db.select().from(posts).orderBy(posts.createdAt)
    ),

    // ログイン済みのみ投稿可能
    create: protectedProcedure
      .input(/* z.object(...) */)
      .mutation(async ({ input, ctx }) => {
        // ctx.session.user.id が使える
        return db.insert(posts).values({
          ...input,
          userId: ctx.session.user.id,
        }).returning()
      }),
  }),
})

export type AppRouter = typeof appRouter
```

---

## 9. コンポーネントでのセッション取得

クライアントコンポーネントでは `useSession()` を使う。

```tsx
import { useSession } from '../lib/auth-client'

function Header() {
  const { data: session, isPending } = useSession()

  if (isPending) return null

  return session ? (
    <div>
      <span>{session.user.name}</span>
      <button onClick={() => signOut()}>ログアウト</button>
    </div>
  ) : (
    <a href="/login">ログイン</a>
  )
}
```

---

## まとめ：セットアップの流れ

```
1. npm install better-auth

2. src/lib/auth.ts を作成（Drizzle adapter を設定）

3. src/routes/api/auth.$.ts を作成
   └── server.handlers に GET / POST で auth.handler(request) を渡す

4. src/lib/auth-client.ts を作成

5. tRPC と連携する場合
   └── src/trpc/init.ts に createContext / protectedProcedure を追加
   └── src/routes/api/trpc.$.ts に createContext を渡す

6. ルート保護
   └── beforeLoad で getWebRequest() → auth.api.getSession() → 未認証なら redirect
```

| ポイント | Next.js | TanStack Start |
|---|---|---|
| API ルート | `app/api/auth/[...all]/route.ts` | `src/routes/api/auth.$.ts`（server.handlers） |
| ルート保護 | `middleware.ts` | `beforeLoad` |
| サーバーでのリクエスト取得 | `headers()` from `next/headers` | `getWebRequest()` from `@tanstack/react-start/server` |
| クライアントでのセッション | `useSession()` | `useSession()`（同じ） |
