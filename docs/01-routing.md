# 01. Routing

TanStack Start のルーティングは **ファイルベース** で、`src/routes/` 以下のファイル構成が URL に対応する。

---

## 1. インデックスルート (`/`)

**ファイル:** `src/routes/index.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => <div>ホームページ</div>,
})
```

---

## 2. 静的ルート (`/about`)

**ファイル:** `src/routes/about.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: () => <div>About ページ</div>,
})
```

---

## 3. 動的ルート (`/posts/$postId`)

**ファイル:** `src/routes/posts/$postId.tsx`

`$` プレフィックスがついたセグメントが URL パラメータになる。
例: `/posts/123` → `params.postId === '123'`

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$postId')({
  component: PostPage,
})

function PostPage() {
  // useParams ではなく Route.useParams() を使うのが TanStack Router 流
  const { postId } = Route.useParams()
  return <div>投稿ID: {postId}</div>
}
```

---

## 4. ネストされたルート (レイアウトルート)

**ファイル構成:**

```
src/routes/
  posts.tsx         ← レイアウト (親)
  posts/
    index.tsx       ← /posts
    $postId.tsx     ← /posts/$postId
```

`posts.tsx` が共通レイアウトになり、`<Outlet />` で子ルートを描画する。

```tsx
// posts.tsx (親レイアウト)
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/posts')({
  component: () => (
    <div>
      <nav>投稿一覧ナビ</nav>
      <Outlet /> {/* 子ルートがここに描画される */}
    </div>
  ),
})
```

---

## 5. ナビゲーション (`<Link>`)

`<Link>` を使うと `routeTree` から型推論された型安全なナビゲーションができる。

```tsx
import { Link } from '@tanstack/react-router'

function Navigation() {
  return (
    <nav>
      <Link to="/">ホーム</Link>
      <Link to="/about">About</Link>

      {/* 動的ルートへのリンクは params を渡す */}
      <Link to="/posts/$postId" params={{ postId: '42' }}>
        投稿 #42
      </Link>

      {/* activeProps: アクティブ時にスタイルを付与 */}
      <Link to="/about" activeProps={{ style: { fontWeight: 'bold' } }}>
        About (アクティブ時太字)
      </Link>
    </nav>
  )
}
```

### `<Link>` はどのファイルに設定するか

決まった場所はないが、一般的には以下の2パターン。

**パターン1: `__root.tsx` に直接書く（全ページ共通ナビ）**

サイト全体に表示するナビバーは `src/routes/__root.tsx` の `RootComponent` に置くのが自然。

```tsx
// src/routes/__root.tsx
function RootComponent() {
  return (
    <RootDocument>
      <nav>
        <Link to="/">ホーム</Link>
        <Link to="/about">About</Link>
      </nav>
      <Outlet />
    </RootDocument>
  )
}
```

**パターン2: コンポーネントファイルに切り出す**

再利用しやすいよう `src/components/` に分離して、`__root.tsx` や各ルートから import する。

```
src/
  components/
    Navigation.tsx  ← ここに書く
  routes/
    __root.tsx      ← Navigation を import して使う
```

```tsx
// src/components/Navigation.tsx
import { Link } from '@tanstack/react-router'

export function Navigation() {
  return (
    <nav>
      <Link to="/">ホーム</Link>
      <Link to="/about">About</Link>
    </nav>
  )
}
```

**まとめ**

| ケース | 置き場所 |
|---|---|
| 全ページ共通ナビ | `src/routes/__root.tsx` |
| 特定のレイアウト配下だけ | そのレイアウトルートファイル |
| 再利用・大きくなってきた | `src/components/Navigation.tsx` に切り出す |

初期設定ではパターン1で `__root.tsx` に書いてしまうのがシンプル。

---

## 5-1. パスなしレイアウトルートでナビを設定する

`__root.tsx` を直接編集せず、トップレベルのレイアウトルートを作成する方法。
TanStack Router では **パスなしレイアウトルート（Pathless Layout Route）** という仕組みを使う。

**ファイル構成:**

```
src/routes/
  __root.tsx
  _layout.tsx          ← パスなしレイアウトルート
  _layout/
    index.tsx          ← /
    about.tsx          ← /about
```

`_`（アンダースコア）で始まるファイルは URL に影響しないレイアウトルートになる。

**実装:**

```tsx
// src/routes/_layout.tsx
import { createFileRoute, Outlet, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout')({
  component: () => (
    <div>
      <nav>
        <Link to="/">ホーム</Link>
        <Link to="/about">About</Link>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  ),
})
```

```tsx
// src/routes/_layout/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/')({
  component: () => <div>ホームページ</div>,
})
```

```tsx
// src/routes/_layout/about.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/about')({
  component: () => <div>About ページ</div>,
})
```

**`__root.tsx` との違い:**

| | `__root.tsx` | パスなしレイアウトルート (`_layout.tsx`) |
|---|---|---|
| 適用範囲 | 全ルート | 配下のルートのみ |
| URL への影響 | なし | なし |
| 使い分け | `<html>` や `<Scripts>` など最外殻 | ナビやサイドバーなど部分的なレイアウト |

`__root.tsx` は `<html>` タグを担当する最外殻として残し、ナビなど UI レイアウトは `_layout.tsx` に分離するのがきれいな構成。

---

## 6. プログラムナビゲーション (`useNavigate`)

Next.js の `useRouter` に相当するが、**型安全性**と**責務の分離**が異なる。

| | TanStack Router `useNavigate` | Next.js `useRouter` |
|---|---|---|
| ナビゲーション | `navigate({ to: '/about' })` | `router.push('/about')` |
| 型安全 | **あり**（ルートツリーから推論） | なし（文字列指定） |
| params | `navigate({ to: '/posts/$postId', params: { postId: '1' } })` | `router.push('/posts/1')` |
| search params | `navigate({ to: '/search', search: { q: 'hello' } })` | `router.push('/search?q=hello')` |
| 戻る | `navigate({ to: -1 })` 相当 | `router.back()` |
| prefetch 等 | なし（`useNavigate` は移動専用） | `router.prefetch()` など多機能 |

最大の違いは**型安全性**で、存在しないルートやパラメータ漏れをコンパイル時に検出できる。
また TanStack Router では `useNavigate` はナビゲーション専用で、他の機能は別フック（`useMatch`、`useLoaderData` など）に分離されている。

```tsx
import { useNavigate } from '@tanstack/react-router'

function LoginButton() {
  const navigate = useNavigate()

  const handleLogin = () => {
    // ログイン処理後にリダイレクト
    navigate({ to: '/' })
  }

  return <button onClick={handleLogin}>ログイン</button>
}
```

---

## 7. ローダー (`loader`) でのデータ事前取得

ルートが表示される前にデータを取得できる。

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    const res = await fetch(`/api/posts/${params.postId}`)
    return res.json() // { title: '...', body: '...' }
  },
  component: PostDetailPage,
})

function PostDetailPage() {
  // loader の戻り値を型安全に取得
  const post = Route.useLoaderData()
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  )
}
```

---

## 8. 検索パラメータ (Search Params)

URL 例: `/search?q=hello&page=1`

`validateSearch` で型・デフォルト値を定義する。

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/search')({
  validateSearch: z.object({
    q: z.string().default(''),
    page: z.number().default(1),
  }),
  component: SearchPage,
})

function SearchPage() {
  const { q, page } = Route.useSearch()
  return (
    <div>
      <p>検索ワード: {q}</p>
      <p>ページ: {page}</p>

      {/* 検索パラメータ付きのリンク */}
      <Link to="/search" search={{ q: 'tanstack', page: 2 }}>
        次のページ
      </Link>
    </div>
  )
}
```
