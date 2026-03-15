import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Navigation } from '../components/navigation'
import { MainSidebarProvider } from '@/components/features/sidebars/main/main-sidebar-provider'

export const Route = createFileRoute('/_layout')({
  component: RouteComponent,
})

// function RouteComponent() {
//   return (
//     <div>
//       <Navigation />
//       <main>
//         <Outlet />
//       </main>
//     </div>
//   )
// }
function RouteComponent() {
  return (
    <MainSidebarProvider>
      <main className="w-full h-full p-6 md:p-8">
        <Outlet />
      </main>
    </MainSidebarProvider>
  )
}
