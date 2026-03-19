import { z } from 'zod'
import { eq, and, desc, sql } from 'drizzle-orm'

import { TRPCError } from '@trpc/server'

import { router, publicProcedure, protectedProcedure } from '../init'
import { db } from '../../db'
import { posts } from '../../db/schema'

export const postsRouter = router({
  // 全件取得（新着順・上限10件）
  list: publicProcedure.query(async () => {
    return db.select().from(posts).orderBy(desc(posts.createdAt)).limit(10)
  }),

  // ID指定取得（useSuspenseQuery / loader 対応）
  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(posts)
        .where(eq(posts.id, input.id))
        .limit(1)
      const post = result[0]
      if (!post) throw new TRPCError({ code: 'NOT_FOUND' })
      return post
    }),

  // ページネーション取得（useSuspenseQuery + validateSearch 対応）
  paginated: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit

      const [items, [{ total }]] = await Promise.all([
        db
          .select()
          .from(posts)
          .orderBy(desc(posts.createdAt))
          .limit(input.limit)
          .offset(offset),
        db.select({ total: sql<number>`count(*)::int` }).from(posts),
      ])

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      }
    }),

  // 無限スクロール取得（useSuspenseInfiniteQuery 対応）
  // cursor = オフセット件数（0始まり）
  infinite: publicProcedure
    .input(
      z.object({
        cursor: z.number().min(0).default(0),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ input }) => {
      const items = await db
        .select()
        .from(posts)
        .orderBy(desc(posts.createdAt))
        .limit(input.limit + 1) // 1件多く取得して次ページの有無を判定
        .offset(input.cursor)

      const hasMore = items.length > input.limit
      const nextCursor = hasMore ? input.cursor + input.limit : undefined

      return {
        items: hasMore ? items.slice(0, input.limit) : items,
        nextCursor,
      }
    }),

  // 新規作成（要ログイン）
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [post] = await db
        .insert(posts)
        .values({
          id: crypto.randomUUID(),
          title: input.title,
          content: input.content,
          userId: ctx.session.user.id,
        })
        .returning()
      return post
    }),

  // 更新（要ログイン・自分の投稿のみ）
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        content: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...patch } = input
      const [post] = await db
        .update(posts)
        .set(patch)
        .where(and(eq(posts.id, id), eq(posts.userId, ctx.session.user.id)))
        .returning()
      if (!post) throw new TRPCError({ code: 'NOT_FOUND' })
      return post
    }),

  // 削除（要ログイン・自分の投稿のみ）
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [post] = await db
        .delete(posts)
        .where(
          and(eq(posts.id, input.id), eq(posts.userId, ctx.session.user.id)),
        )
        .returning()
      if (!post) throw new TRPCError({ code: 'NOT_FOUND' })
      return { id: post.id }
    }),
})
