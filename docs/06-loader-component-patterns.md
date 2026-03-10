# 06. loader と component のパターン・よくある疑問

---

## 1. `useSuspenseQuery` はどこで呼ぶか

`useSuspenseQuery` はフックなので、`Route` に渡す `component`（またはそこから呼ばれる子コンポーネント）の中で呼ぶ。

```tsx
export const Route = createFileRoute('/_layout/posts/$postId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      trpc.posts.byId.suspenseQueryOptions({ id: Number(params.postId) })
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

// useSuspenseQuery を呼ぶコンポーネントは <Suspense> の内側に置く
function PostDetail({ id }: { id: number }) {
  const { data } = useSuspenseQuery(
    trpc.posts.byId.suspenseQueryOptions({ id })
  )
  return <h1>{data.title}</h1>
}
```

**注意:** `useSuspenseQuery` を呼ぶコンポーネント自体は `<Suspense>` の**内側**に置く必要がある。
自分の外側に `<Suspense>` を置けないため、子コンポーネントに分けるのが一般的なパターン。

---

## 2. Next.js との対比

### 誤解しやすい点

> 「Route = サーバー側、component = クライアント側」

これは**厳密には正しくない**。

### 正確な対比

| | Next.js | TanStack Start |
|---|---|---|
| サーバー専用 | Server Component | **なし**（相当するものがない） |
| データ取得 | Server Component の `async/await` | `loader`（**サーバー＋クライアント両方**で動く） |
| UI レンダリング | Client Component | `component`（SSR 後にハイドレート） |

### `loader` は isomorphic（同型）

```ts
export const Route = createFileRoute('/_layout/posts/$postId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(...),
    // 初回アクセス（SSR）→ サーバーで実行
    // クライアント遷移  → ブラウザで実行
  component: PostPage,
})
```

- **初回アクセス（SSR）**: サーバーで `loader` 実行 → `component` をサーバーレンダリング → クライアントでハイドレート
- **クライアント遷移（リンク踏んだとき）**: ブラウザで `loader` 実行 → `component` をクライアントレンダリング

### Next.js との正確な対応関係

```
Next.js Server Component   ≠  TanStack Route
Next.js getServerSideProps ≈  TanStack loader（ただし isomorphic）
Next.js Client Component   ≈  TanStack component
```

TanStack Start には **React Server Components に相当するものがない**。
`component` は Next.js の Client Component に近いが、SSR 時にサーバーでも一度レンダリングされる。

**正確な理解:** 「`loader` = データ取得の場所、`component` = UI と hooks の場所」

---

## 3. component 内で async 処理が必要な場合

React では `component` 内で直接 `await` は使えない。状況に応じて以下の方法を選ぶ。

### 方法1: `loader` に寄せる（最もシンプル）

async 処理は `loader` で完結させ、`component` には結果だけ渡す。

```tsx
export const Route = createFileRoute('/example')({
  loader: async () => {
    const result = await someAsyncLibrary.fetch()  // ここで await
    return { result }
  },
  component: ExamplePage,
})

function ExamplePage() {
  const { result } = Route.useLoaderData()  // 結果だけ受け取る
  return <div>{result.name}</div>
}
```

### 方法2: React 19 の `use()` フック

このプロジェクトは React 19（`"react": "^19.2.4"`）なので `use()` が使える。
Promise を直接コンポーネントで unwrap でき、`<Suspense>` と連携する。

```tsx
import { use, Suspense } from 'react'

// Promise をコンポーネント外で作る
const dataPromise = fetchSomething()

function MyComponent() {
  const data = use(dataPromise)  // Suspense と連携して自動で待機
  return <div>{data.name}</div>
}

function Page() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <MyComponent />
    </Suspense>
  )
}
```

### 方法3: `useEffect` + `useState`（クライアント限定の副作用）

サードパーティ SDK の初期化など、クライアントでしか動かない処理。

```tsx
function MyComponent() {
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    someLibrary.initialize().then(setData)
  }, [])

  if (!data) return <div>初期化中...</div>
  return <div>{data.name}</div>
}
```

### 選択指針

```
component 内で async が必要
├── ルートのデータ取得         → loader に移す（方法1）✅
├── React 19 + Suspense 対応   → use() フック（方法2）✅
└── クライアント限定の副作用   → useEffect + useState（方法3）
```

---

## 4. loader で複数の非同期処理を並列実行する

依存関係のない処理は `Promise.all()` で並列に投げると速い。

### 通常の async 処理

```ts
loader: async () => {
  // 直列（遅い）
  const posts = await fetchPosts()
  const user = await fetchUser()       // posts が終わるまで待つ

  // 並列（速い）
  const [posts, user, settings] = await Promise.all([
    someLibrary.fetchPosts(),
    someLibrary.fetchUser(),
    someLibrary.fetchSettings(),
  ])
  return { posts, user, settings }
},
```

### tRPC + TanStack Query の場合

`ensureQueryData` を `Promise.all()` で並列に投げる。
戻り値は不要（キャッシュに乗るので `component` 側で取得する）。

```ts
loader: async ({ params }) => {
  await Promise.all([
    queryClient.ensureQueryData(trpc.posts.list.queryOptions()),
    queryClient.ensureQueryData(trpc.user.me.queryOptions()),
  ])
},

function MyComponent() {
  // loader でキャッシュ済みなので即座に取得できる
  const { data: posts } = useSuspenseQuery(trpc.posts.list.suspenseQueryOptions())
  const { data: user } = useSuspenseQuery(trpc.user.me.suspenseQueryOptions())
}
```

---

## まとめ

| 処理の種類 | 置き場所 |
|---|---|
| ルート遷移前のデータ取得 | `loader` |
| 複数データの並列取得 | `loader` 内で `Promise.all()` |
| UI レンダリング・hooks | `component`（および子コンポーネント） |
| Suspense 対応データ取得 | `component` 内で `useSuspenseQuery` / `use()` |
| クライアント限定の副作用 | `component` 内で `useEffect` |
