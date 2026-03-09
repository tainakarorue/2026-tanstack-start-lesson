import { createServerFn } from "@tanstack/react-start"

export const getHello = createServerFn().handler(async () => {
  return { message: 'Hello from server!' }
})