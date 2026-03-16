import { Link } from '@tanstack/react-router'
import { ChevronsUpDownIcon, LogInIcon, LogOutIcon } from 'lucide-react'

import { useMounted } from '@/hooks/use-mounted'
import {
  UserAvatar,
  UserAvatarSkeleton,
} from '@/components/features/user/user-avatar'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Props {
  user: {
    name: string
    email: string
    image?: string | null
  } | null
  isPending: boolean
  onLogout: () => void
  isLoggingOut: boolean
}

export const MainUserMenu = ({
  user,
  isPending,
  onLogout,
  isLoggingOut,
}: Props) => {
  const mounted = useMounted()

  if (!mounted || isPending) {
    return (
      <SidebarMenuButton className="py-6">
        <UserAvatarSkeleton />
      </SidebarMenuButton>
    )
  }

  if (!user) {
    return (
      <SidebarMenuButton asChild className="py-5">
        <Link to="/sign-in">
          <LogInIcon />
          <span>Sign in</span>
        </Link>
      </SidebarMenuButton>
    )
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild className="py-6">
        <SidebarMenuButton>
          <UserAvatar name={user.name} email={user.email} image={user.image} />
          <ChevronsUpDownIcon className="ml-auto" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 space-y-2">
        <DropdownMenuLabel>
          <UserAvatar name={user.name} email={user.email} image={user.image} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} disabled={isLoggingOut}>
          <LogOutIcon />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
