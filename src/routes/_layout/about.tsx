import { createFileRoute } from '@tanstack/react-router'
import { getHello } from '@/server/hello'
import { createPost, getPost } from '@/server/posts'

export const Route = createFileRoute('/_layout/about')({
  // loader: () => getHello(),
  loader: async () => {
    const [hello, post] = await Promise.all([
      getHello(),
      getPost({ data: { id: '1' } })
    ])
    return { hello, post }
  },
  component: RouteComponent,
})

function RouteComponent() {
  // const data = Route.useLoaderData()
  const { hello, post } = Route.useLoaderData()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const title = (form.elements.namedItem('title') as HTMLInputElement).value
    const body = (form.elements.namedItem('body') as
      HTMLTextAreaElement).value
    await createPost({
      data: { title, body },
    })
  }

  return <div>
    <div>
      Hello "/about"!
    </div>
    <div>
      <p>
        {hello.message}
      </p>
      <p>
        {post.title}
      </p>
    </div>

    <form onSubmit={handleSubmit} className='flex flex-col gap-y-3'>
      <input name="title" placeholder="タイトル" />
      <textarea name="body" placeholder="本文" />
      <button type="submit">投稿</button>
    </form>

  </div>
}
