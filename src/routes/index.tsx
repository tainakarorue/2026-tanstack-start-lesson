import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()

  const onClick = () => {
    navigate({ to: '/about' })
  }
  return (
    <div>
      Hello "/"!
      <div>
        <button onClick={onClick}>Go About</button>
      </div>
    </div>
  )
}
