// Shared by the Deno backend (server/) and the React app.
export type Todo = {
  id: number
  title: string
  done: boolean
  createdAt: string
}
