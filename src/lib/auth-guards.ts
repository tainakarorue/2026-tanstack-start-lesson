import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'

// 未ログインならサインインページへリダイレクト（beforeLoad / プロテクトページ用）
export const requireAuth = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw redirect({ to: '/sign-in' })
    return { session }
  },
)

// ログイン済みならトップページへリダイレクト（beforeLoad / サインインページ用）
export const requireGuest = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (session) throw redirect({ to: '/' })
  },
)
