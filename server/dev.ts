// API-only server for `npm run dev` (Vite proxies /api to this port).
// Not part of the desktop app.
import { handleApi } from "./routes.ts"

Deno.serve({ port: 8787 }, (req) => handleApi(req))
