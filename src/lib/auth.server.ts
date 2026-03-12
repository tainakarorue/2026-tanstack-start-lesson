import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'

export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    return session
  },
)

export const ensureSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    if (!session) {
      throw new Error('Unauthorized')
    }

    return session
  },
)

// 未ログインならサインインページへリダイレクト（beforeLoad / プロテクトページ用）
export async function requireAuth() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect({ to: '/' })
  return { session }
}

// ログイン済みならトップページへリダイレクト（beforeLoad / サインインページ用）
export async function requireGuest() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (session) throw redirect({ to: '/' })
}
