import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { MainSidebar } from './main-sidebar'
import { ModeToggleButton } from '@/components/mode-toggle-button'

interface Props {
  children: React.ReactNode
}

export const MainSidebarProvider = ({ children }: Props) => {
  return (
    <SidebarProvider>
      <MainSidebar />
      <div className="w-full flex flex-col">
        <div className="w-full flex items-center justify-between p-4 border-b">
          <div className="w-full flex items-center gap-x-2">
            <SidebarTrigger />
          </div>
          <ModeToggleButton />
        </div>
        {children}
      </div>
    </SidebarProvider>
  )
}
