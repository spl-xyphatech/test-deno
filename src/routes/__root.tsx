import { DevTool } from "@/components/dev/dev-tool"
import { createRootRoute, Outlet } from "@tanstack/react-router"

export const RootLayout = () => (
  <>
    <Outlet />
    <DevTool />
  </>
)

export const Route = createRootRoute({ component: RootLayout })
