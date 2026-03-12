# 09. Better Auth セットアップ

TanStack Start に Better Auth を導入する手順。
schema（user / session / account / verification）と `.env` は 08 で設定済み。

---

## Next.js との比較

| 項目 | Next.js | TanStack Start |
|---|---|---|
| パッケージ | 同じ | 同じ |
| `src/lib/auth.ts` | ほぼ同じ（プラグイン追加あり） | `tanstackStartCookies()` プラグインが必須 |
| `src/lib/auth-client.ts` | 同じ | 同じ（クライアント側で使う場合に必要） |
| API ハンドラー | `app/api/auth/[...all]/route.ts` | `src/routes/api/auth.$.ts`（`server.handlers` 形式） |
| セッション取得（サーバー） | Server Component で `auth.api.getSession()` | `loader` / `beforeLoad` で `getWebRequest()` 経由 |
| ルート保護 | middleware.ts | `beforeLoad`（ユーティリティ関数で共通化） |
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
    auth.server.ts   ← サーバー専用関数（getSession / ensureSession / requireAuth / requireGuest）
    auth-client.ts   ← Better Auth クライアント（クライアント側で使う場合）
  trpc/
    init.ts          ← context に session を追加（変更あり）
  routes/
    api/
      auth.$.ts      ← Better Auth の HTTP エンドポイント（新規）
      trpc.$.ts      ← createContext を渡す（変更あり）
```

> **注意:** ファイルは `src/routes/api/auth.$.ts`（ドット記法）で作成する。
> `src/routes/api/auth/$.ts`（ディレクトリ構造）でも動作するが、
> `trpc.$.ts` と記法を統一するためドット記法を使う。
> 新規作成後は開発サーバーを起動して `routeTree.gen.ts` を再生成すること。

---

## 3. `src/lib/auth.ts` — サーバーインスタンス

```ts
// src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '../db'
import * as schema from '../db/schema'

export const auth = betterAuth({
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

  plugins: [tanstackStartCookies()], // TanStack Start でクッキーを正しく扱うために必須
})
```

### ポイント

- `secret` / `baseURL` は config に書かなくてよい。Better Auth が環境変数から自動で読み込む。
  - `secret` → `BETTER_AUTH_SECRET`
  - `baseURL` → `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET` は `.env` に必ず設定すること（未設定だと再起動のたびにセッションが無効になる）。
- `tanstackStartCookies()` は **必須**。TanStack Start は Web 標準の Fetch API ベースのため、このプラグインがないとログイン後にセッションクッキーが正しくセットされない。

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
      GET: async ({ request }: { request: Request }) => auth.handler(request),
      POST: async ({ request }: { request: Request }) => auth.handler(request),
    },
  },
})
```

これにより `/api/auth/*` のすべてのパスを Better Auth が処理する。

---

## 5. `src/lib/auth-client.ts` — クライアント（Next.js と同じ）

クライアント側（React コンポーネント）で `useSession()` / `signIn()` / `signOut()` を使う場合に必要。
サーバー側のみで使う場合は不要。

```ts
// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()

export const { signIn, signUp, signOut, useSession } = authClient
```

> **補足:** `baseURL` は同一オリジンなら省略可能。クライアントコードで環境変数を使う場合は `VITE_` プレフィックスが必要。

---

## 6. `src/lib/auth.server.ts` — サーバー専用関数

`.server.ts` 拡張子により、このファイルはサーバーバンドルにのみ含まれる。
`createServerFn` を使ったセッション取得関数と、`beforeLoad` 用のリダイレクト関数をまとめる。

> **注意:** `requireAuth` / `requireGuest` を `utils.ts` に書いてはいけない。
> `utils.ts` は `cn()` 経由でクライアントバンドルに含まれるため、サーバー専用の `auth` が漏れてしまう。

```ts
// src/lib/auth.server.ts
import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'

// createServerFn 経由でセッションを取得（loader / component から呼べる）
export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders()
    return auth.api.getSession({ headers })
  },
)

// 未認証なら Error を throw（createServerFn 内で使う）
export const ensureSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    if (!session) throw new Error('Unauthorized')
    return session
  },
)

// 未ログインならサインインページへリダイレクト（beforeLoad / プロテクトページ用）
export async function requireAuth() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect({ to: '/sign-in' }) // /sign-in ページ作成後に有効になる
  return { session }
}

// ログイン済みならトップページへリダイレクト（beforeLoad / サインインページ用）
export async function requireGuest() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (session) throw redirect({ to: '/' })
}
```

### 使い方

```ts
// プロテクトページ（未ログインなら /sign-in へ）
import { requireAuth } from '../lib/auth.server'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: requireAuth,
  component: DashboardPage,
})

function DashboardPage() {
  const { session } = Route.useRouteContext()
  return <div>ようこそ、{session.user.name} さん</div>
}
```

```ts
// サインインページ（ログイン済みなら / へ）
import { requireGuest } from '../lib/auth.server'

export const Route = createFileRoute('/sign-in')({
  beforeLoad: requireGuest,
  component: SignInPage,
})
```

### `beforeLoad` で複数処理がある場合

`Promise.all()` は使わず、**順次実行**する。
`throw redirect` が発生した後にもう片方が実行されてしまうため。

```ts
export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const { session } = await requireAuth() // 未認証ならここで throw redirect
    const permissions = await checkPermissions(session.user.id) // 認証後に実行
    return { session, permissions }
  },
})
```

> `Promise.all()` が有効なのは `loader` 内で `throw` しない独立したデータフェッチを並列化する場合。

### 複数ルートをまとめて保護する場合

レイアウトルートの `beforeLoad` に書くと配下のすべてのルートに適用される。

```ts
// src/routes/_auth.tsx（認証済みユーザー専用レイアウト）
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '../lib/auth.server'

export const Route = createFileRoute('/_auth')({
  beforeLoad: requireAuth,
  component: () => <Outlet />,
})
```

---

## 7. tRPC との連携（TanStack Start 固有）

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
    createContext: ({ req }) => createContext(req),
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

---

## 8. コンポーネントでのセッション取得

クライアントコンポーネントでは `useSession()` を使う。

```tsx
import { useSession, signOut } from '../lib/auth-client'

function Header() {
  const { data: session, isPending } = useSession()

  if (isPending) return null

  return session ? (
    <div>
      <span>{session.user.name}</span>
      <button onClick={() => signOut()}>ログアウト</button>
    </div>
  ) : (
    <a href="/sign-in">ログイン</a>
  )
}
```

---

## まとめ：セットアップの流れ

```
1. npm install better-auth

2. src/lib/auth.ts を作成
   └── tanstackStartCookies() プラグインを必ず追加
   └── secret / baseURL は環境変数から自動読み込みのため config 不要

3. src/routes/api/auth.$.ts を作成（ドット記法）
   └── server.handlers に GET / POST で auth.handler(request) を渡す
   └── 作成後は npm run dev でルートツリーを再生成

4. src/lib/auth.server.ts を作成
   └── getSession / ensureSession（createServerFn 版）
   └── requireAuth / requireGuest（beforeLoad 用）
   └── ※ utils.ts に書かないこと（クライアントバンドルに混入するため）

5. src/lib/auth-client.ts を作成（クライアント側で認証を使う場合）

6. tRPC と連携する場合
   └── src/trpc/init.ts に createContext / protectedProcedure を追加
   └── src/routes/api/trpc.$.ts に createContext を渡す
```

| ポイント | Next.js | TanStack Start |
|---|---|---|
| API ルート | `app/api/auth/[...all]/route.ts` | `src/routes/api/auth.$.ts`（server.handlers） |
| クッキー処理 | 自動 | `tanstackStartCookies()` プラグインが必須 |
| ルート保護 | `middleware.ts` | `beforeLoad`（`requireAuth` / `requireGuest`） |
| サーバーでのリクエスト取得 | `headers()` from `next/headers` | `getRequest()` from `@tanstack/react-start/server` |
| クライアントでのセッション | `useSession()` | `useSession()`（同じ） |

---

## ルート構成パターン

### フォルダ構成

TanStack Router ではレイアウトルートのアンダースコアプレフィックス（`_`）を使い、
認証済み専用エリアとパブリックエリアを分離する。

```
src/routes/
  __root.tsx               ← 全体共通レイアウト（ヘッダー等）

  _public/                 ← 認証不要エリア（requireGuest でログイン済みをリダイレクト）
    _public.tsx            ← レイアウト（beforeLoad: requireGuest）
    _public.sign-in.tsx    ← /sign-in
    _public.sign-up.tsx    ← /sign-up

  _protected/              ← 認証必須エリア（requireAuth で未認証をリダイレクト）
    _protected.tsx         ← レイアウト（beforeLoad: requireAuth）
    _protected.dashboard/
      _protected.dashboard.tsx       ← /dashboard
      _protected.dashboard.index.tsx ← /dashboard（index）
      _protected.dashboard.settings.tsx ← /dashboard/settings

  index.tsx                ← / （パブリック）
  api/
    auth.$.ts
    trpc.$.ts
```

> **アンダースコアの意味:**
> - `_public` / `_protected` はパス名に含まれない（URLに出ない）レイアウトセグメント。
> - `_public.sign-in.tsx` のドット記法で `/sign-in` というパスになる。

---

### レイアウトルートの実装例

```tsx
// src/routes/_public/_public.tsx  ← 認証不要エリアのレイアウト
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireGuest } from '../../lib/auth.server'

export const Route = createFileRoute('/_public')({
  beforeLoad: requireGuest,
  component: () => <Outlet />,
})
```

```tsx
// src/routes/_protected/_protected.tsx  ← 認証必須エリアのレイアウト
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '../../lib/auth.server'

export const Route = createFileRoute('/_protected')({
  beforeLoad: requireAuth,
  component: () => <Outlet />,
})
```

---

### ネストしたページの実装例

```tsx
// src/routes/_protected/_protected.dashboard.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  // requireAuth が return した session は親の useRouteContext で取得
  const { session } = Route.useRouteContext()
  return <div>ようこそ、{session.user.name} さん</div>
}
```

```tsx
// src/routes/_protected/_protected.dashboard.settings.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/dashboard/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { session } = Route.useRouteContext()
  return <div>{session.user.email} の設定</div>
}
```

---

### session の流れ

```
_protected.tsx（beforeLoad: requireAuth）
  └── return { session }
        ↓ RouteContext に自動でマージ
  _protected.dashboard.tsx
  _protected.dashboard.settings.tsx
    └── Route.useRouteContext() → { session } が使える
```

`requireAuth` が return した値は、子ルートの `useRouteContext()` でそのまま受け取れる。
各ページで個別に `beforeLoad` を書く必要はない。
