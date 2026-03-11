# 08. Drizzle + Neon によるデータベース構築

TanStack Start に Drizzle ORM + Neon（PostgreSQL）を導入する手順。
Next.js との差異についても都度補足する。

---

## Next.js との比較：同じ部分・異なる部分

| 項目                     | Next.js                                          | TanStack Start                              |
| ------------------------ | ------------------------------------------------ | ------------------------------------------- |
| パッケージ               | 同じ                                             | 同じ                                        |
| `drizzle.config.ts`      | 同じ                                             | 同じ                                        |
| スキーマ定義             | 同じ                                             | 同じ                                        |
| マイグレーションコマンド | 同じ                                             | 同じ                                        |
| `.env` の設定            | 同じ                                             | 同じ                                        |
| `db` インスタンス作成    | 同じ                                             | 同じ                                        |
| **DB クエリを書く場所**  | Server Component / Server Action / Route Handler | **tRPC プロシージャ / createServerFn のみ** |

> `loader` は isomorphic（サーバー＋クライアント両方で動く）ため、
> loader に直接 DB クエリを書くと DB 接続情報がブラウザに露出する。
> 必ず tRPC か `createServerFn` 経由で呼び出すこと。（06 参照）

---

## 1. パッケージのインストール

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

---

## 2. 環境変数の設定

```bash
# .env
DATABASE_URL=postgresql://ユーザー名:パスワード@ホスト/データベース名?sslmode=require
```

TanStack Start での環境変数の参照方法は Next.js と異なる（後述 §7 参照）。

---

## 3. ファイル構成

```
src/
  db/
    index.ts      ← db インスタンス（Neon 接続）
    schema.ts     ← テーブル定義
drizzle.config.ts ← drizzle-kit の設定
.env              ← DATABASE_URL
```

---

## 4. `drizzle.config.ts`（Next.js と完全に同じ）

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

---

## 5. スキーマ定義（Next.js と完全に同じ）

```ts
// src/db/schema.ts
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
```

---

## 6. db インスタンスの作成（Next.js と完全に同じ）

Neon のサーバーレスドライバーを使用する。
HTTP モードはコネクションプールが不要でサーバーレス環境に適している。

```ts
// src/db/index.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)

export const db = drizzle(sql, { schema })
```

---

## 7. 環境変数の参照方法（TanStack Start 固有の注意点）

Next.js では `process.env.DATABASE_URL` をサーバー側ならどこでも参照できるが、
TanStack Start では**サーバー関数の外から `process.env` を参照してもクライアントに漏洩しない保証がない**。

`src/db/index.ts`（サーバー専用ファイル）は tRPC や `createServerFn` からのみ import するため、
実質的にサーバーでしか実行されない。ただし、念のため `.env` の変数名に `VITE_` プレフィックスを
**付けない**こと（`VITE_` 付きはビルド時にクライアントバンドルに埋め込まれる）。

```bash
# ✅ 正しい（サーバー専用）
DATABASE_URL=postgresql://...

# ❌ クライアントに露出する
VITE_DATABASE_URL=postgresql://...
```

---

## 8. マイグレーション（Next.js と完全に同じ）

```bash
# スキーマからマイグレーションファイルを生成
npx drizzle-kit generate

# Neon に直接プッシュ（開発時）
npx drizzle-kit push

# マイグレーションファイルを適用（本番推奨）
npx drizzle-kit migrate
```

---

## 9. tRPC ルーターから DB を呼び出す（TanStack Start 固有）

Next.js では Server Component や Server Action から直接 `db` を import できるが、
TanStack Start では **tRPC プロシージャの中**から呼び出す。

```ts
// src/trpc/router.ts
import { z } from 'zod'
import { router, publicProcedure } from './init'
import { db } from '../db' // ← tRPC の中だけで import
import { posts } from '../db/schema'
import { eq } from 'drizzle-orm'

export const appRouter = router({
  posts: router({
    // 一覧取得
    list: publicProcedure.query(async () => {
      return db.select().from(posts).orderBy(posts.createdAt)
    }),

    // ID で取得
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const result = await db
          .select()
          .from(posts)
          .where(eq(posts.id, input.id))
          .limit(1)
        return result[0] ?? null
      }),

    // 作成
    create: publicProcedure
      .input(z.object({ title: z.string().min(1), body: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const result = await db.insert(posts).values(input).returning()
        return result[0]
      }),

    // 削除
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.delete(posts).where(eq(posts.id, input.id))
        return { success: true }
      }),
  }),
})

export type AppRouter = typeof appRouter
```

---

## 10. `createServerFn` から DB を呼び出す（tRPC を使わない場合）

tRPC を使わずシンプルにサーバー関数として定義する方法。

```ts
// src/server/posts.ts
import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { posts } from '../db/schema'

export const getPosts = createServerFn().handler(async () => {
  return db.select().from(posts).orderBy(posts.createdAt)
})

export const createPost = createServerFn()
  .validator((data: { title: string; body: string }) => data)
  .handler(async ({ data }) => {
    const result = await db.insert(posts).values(data).returning()
    return result[0]
  })
```

```tsx
// ルートコンポーネントから呼ぶ
export const Route = createFileRoute('/posts')({
  loader: () => getPosts(), // createServerFn はサーバーでのみ実行される
  component: PostsPage,
})

function PostsPage() {
  const posts = Route.useLoaderData()
  return (
    <ul>
      {posts.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  )
}
```

---

## 11. Next.js との呼び出しパターン比較

### データ取得

```ts
// Next.js（Server Component）
// app/posts/page.tsx
export default async function PostsPage() {
  const posts = await db.select().from(postsTable)  // 直接 await
  return <ul>...</ul>
}

// TanStack Start（tRPC）
// src/trpc/router.ts
posts: router({
  list: publicProcedure.query(() =>
    db.select().from(postsTable)  // tRPC プロシージャの中
  ),
})
// src/routes/_layout/posts/index.tsx
function PostsList() {
  const { data } = useSuspenseQuery(trpc.posts.list.suspenseQueryOptions())
  return <ul>...</ul>
}
```

### データ更新

```ts
// Next.js（Server Action）
// app/posts/actions.ts
'use server'
export async function createPost(formData: FormData) {
  await db.insert(postsTable).values({ ... })
}

// TanStack Start（tRPC mutation）
// src/trpc/router.ts
create: publicProcedure
  .input(z.object({ title: z.string(), body: z.string() }))
  .mutation(({ input }) => db.insert(postsTable).values(input).returning())

// コンポーネント
const { mutate } = useMutation(trpc.posts.create.mutationOptions())
```

---

## まとめ：セットアップの流れ

```
1. npm install drizzle-orm @neondatabase/serverless drizzle-kit
2. .env に DATABASE_URL を設定（VITE_ プレフィックスは付けない）
3. drizzle.config.ts を作成（Next.js と同じ）
4. src/db/schema.ts にテーブル定義（Next.js と同じ）
5. src/db/index.ts に db インスタンス作成（Next.js と同じ）
6. npx drizzle-kit push でテーブルを作成
7. src/trpc/router.ts のプロシージャ内から db を呼び出す ← TanStack Start 固有
```

| ステップ                                             | Next.js と同じか                            |
| ---------------------------------------------------- | ------------------------------------------- |
| パッケージ・設定ファイル・スキーマ・マイグレーション | ✅ 同じ                                     |
| DB クエリを書く場所                                  | ❌ 異なる（tRPC / createServerFn の中のみ） |
