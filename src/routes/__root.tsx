// src/routes/__root.tsx
/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  Link,
} from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../trpc/query-client'

import '../app.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootDocument>
        <Outlet />
      </RootDocument>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

function NotFoundComponent() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-accent">
      <div className="flex flex-col items-center justify-center gap-y-2">
        <p className="text-6xl font-bold text-muted-foreground text-center">
          404
        </p>
        <span className="text-4xl font-bold text-muted-foreground text-center">
          ページが見つかりません
        </span>
        <Link
          to="/"
          className="font-medium text-muted-foreground hover:underline"
        >
          ホームへ戻る
        </Link>
      </div>
    </div>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="w-full h-svh">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  )
}
