import { UpdateBanner } from "@/components/update-banner"
import { DevTool } from "@/components/dev/dev-tool"
import { createRootRoute, Outlet } from "@tanstack/react-router"

export const RootLayout = () => (
  <>
    <UpdateBanner />
    <Outlet />
    <DevTool />
  </>
)

export const Route = createRootRoute({ component: RootLayout })
