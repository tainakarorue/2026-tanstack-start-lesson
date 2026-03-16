import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { authClient } from '@/lib/auth-client'

export const useSafeLogout = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(false)

  const logout = async () => {
    setIsLoading(true)
    try {
      await authClient.signOut()

      queryClient.clear()

      navigate({ to: '/sign-in' })
    } catch (error) {
      console.log(error)
    } finally {
      setIsLoading(false)
    }
  }

  return { logout, isLoading }
}
