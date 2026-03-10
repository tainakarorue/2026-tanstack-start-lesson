import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import type { AppRouter } from './router'
import { queryClient } from './query-client'

const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
    }),
  ],
})

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client,
  queryClient,
})
