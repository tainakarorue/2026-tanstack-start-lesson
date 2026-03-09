import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const getPost = createServerFn()
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    // data.id は string として型推論される
    const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${data.id}`)
    return res.json() as Promise<{ id: number; title: string; body: string }>
  })

export const createPost = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ title: z.string(), body: z.string() }))
  .handler(async ({ data }) => {
    const { title, body } = data
    console.log(title, body)

    return { message: 'success' }
  })