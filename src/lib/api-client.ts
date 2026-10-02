import axios from "axios"

// Same origin in the desktop app (main.ts serves /api). Under `npm run dev`
// Vite proxies /api to server/dev.ts.
export const api = axios.create({ baseURL: "/api" })
