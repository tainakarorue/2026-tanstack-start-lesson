# 03. Server Functions (`createServerFn`)

TanStack Start 独自の機能。サーバーサイドの処理をファイル内に直接書ける。
Next.js の Server Actions に相当するが、**明示的に関数として定義**する点が異なる。

---

## 1. 基本的な使い方

```ts
// src/server/hello.ts
import { createServerFn } from '@tanstack/react-start'

export const getHello = createServerFn().handler(async () => {
  return { message: 'Hello from server!' }
})
```

クライアントコンポーネントから呼び出す。

```tsx
// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { getHello } from '../server/hello'

export const Route = createFileRoute('/')({
  loader: () => getHello(),
  component: IndexPage,
})

function IndexPage() {
  const data = Route.useLoaderData()
  return <div>{data.message}</div>
}
```

---

## 2. バリデーション付き (zod)

引数を受け取る場合は `.validator()` でスキーマを定義する。

```ts
// src/server/posts.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const getPost = createServerFn()
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    // data.id は string として型推論される
    const res = await fetch(
      `https://jsonplaceholder.typicode.com/posts/${data.id}`,
    )
    return res.json() as Promise<{ id: number; title: string; body: string }>
  })
```

```tsx
// src/routes/_layout/posts/$postId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { getPost } from '../../../server/posts'

export const Route = createFileRoute('/_layout/posts/$postId')({
  loader: ({ params }) => getPost({ data: { id: params.postId } }),
  component: PostPage,
})

function PostPage() {
  const post = Route.useLoaderData()
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  )
}

}
```

getPost は id が必要なので、例えば id: '1' で取得する場合、loader でまとめてオブジェクトを返します：

```tsx
export const Route = createFileRoute('/_layout/about')({
  loader: async () => {
    const [hello, post] = await Promise.all([
      getHello(),
      getPost({ data: { id: '1' } }),
    ])
    return { hello, post }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { hello, post } = Route.useLoaderData()
  return (
    <div>
      <div>{hello.message}</div>
      <div>{post.title}</div>
    </div>
  )
}
```

ポイント：
- `loader` は単一の値しか返せないため、複数データはオブジェクトにまとめて返す
- 並列取得したい場合は `Promise.all()` を使う（直列より高速）
- `getPost` は `inputValidator` でスキーマを定義しているため、呼び出し時に `{ data: { id: '...' } }` の形で渡す

---

## 3. POST (ミューテーション)

`method('POST')` を指定するとフォーム送信やボタンクリックなどの更新処理に使える。

```ts
// src/server/posts.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const createPost = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ title: z.string(), body: z.string() }))
  .handler(async ({ data }) => {
    const res = await fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  })
```

```tsx
// コンポーネントから呼び出す
function CreatePostForm() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    await createPost({
      data: {
        title: form.title.value,
        body: form.body.value,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="タイトル" />
      <textarea name="body" placeholder="本文" />
      <button type="submit">投稿</button>
    </form>
  )
}
```

---

## createServerFn と tRPC の使い分け

|                      | `createServerFn`             | tRPC                                       |
| -------------------- | ---------------------------- | ------------------------------------------ |
| 用途                 | ページ単位のデータ取得・更新 | 複数ページにまたがる API 層                |
| 型安全               | ◎                            | ◎                                          |
| キャッシュ管理       | loader 任せ                  | TanStack Query で細かく制御                |
| 外部クライアント対応 | ✕                            | ○                                          |
| 向いている場面       | SSR 前提のシンプルな処理     | 複雑なデータフェッチ・再利用性が必要な場合 |

本格的なアプリでは `createServerFn` を tRPC のエンドポイントの呼び出しに使い、ビジネスロジックは tRPC ルーターに集約するパターンが一般的。
