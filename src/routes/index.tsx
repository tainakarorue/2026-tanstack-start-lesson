import { Button } from '@/components/ui/button'
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
        <Button onClick={onClick}>Go About</Button>
      </div>
    </div>
  )
}
