import { z } from 'zod'

import { postsRouter } from './routers/posts'
import { router, publicProcedure } from './init'

export const appRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return { message: `Hello, ${input.name ?? 'World'}!` }
    }),
  posts: router({
    list: publicProcedure.query(async () => {
      const res = await fetch(
        'https://jsonplaceholder.typicode.com/posts?_limit=10',
      )
      return res.json() as Promise<
        { id: number; title: string; body: string }[]
      >
    }),

    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const res = await fetch(
          `https://jsonplaceholder.typicode.com/posts/${input.id}`,
        )
        return res.json() as Promise<{
          id: number
          title: string
          body: string
        }>
      }),

    create: publicProcedure
      .input(z.object({ title: z.string(), body: z.string() }))
      .mutation(async ({ input }) => {
        const res = await fetch('https://jsonplaceholder.typicode.com/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        return res.json() as Promise<{
          id: number
          title: string
          body: string
        }>
      }),
  }),
  postsRouter: postsRouter,
})

// クライアントで型を使うためにエクスポート
export type AppRouter = typeof appRouter

// import { router, publicProcedure, protectedProcedure } from './init'
// import { db } from '../db'
// import { posts } from '../db/schema'

// export const appRouter = router({
//   posts: router({
//     // 誰でも閲覧可能
//     list: publicProcedure.query(() =>
//       db.select().from(posts).orderBy(posts.createdAt),
//     ),

// ログイン済みのみ投稿可能
// --- DB実装前（JSONPlaceholderモック） ---
// create: protectedProcedure
//   .input(z.object({ title: z.string(), body: z.string() }))
//   .mutation(async ({ input }) => {
//     const res = await fetch('https://jsonplaceholder.typicode.com/posts', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(input),
//     })
//     return res.json() as Promise<{
//       id: number
//       title: string
//       body: string
//     }>
//   }),
// --- DB実装後 ---
//     create: protectedProcedure
//       .input(z.object({ title: z.string(), content: z.string() }))
//       .mutation(async ({ input, ctx }) => {
//         const [post] = await db
//           .insert(posts)
//           .values({
//             id: crypto.randomUUID(),
//             title: input.title,
//             content: input.content,
//             userId: ctx.session.user.id,
//           })
//           .returning()
//         return post
//       }),
//   }),
// })

// export type AppRouter = typeof appRouter
