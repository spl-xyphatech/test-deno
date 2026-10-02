import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  useCreateTodo,
  useDeleteTodo,
  useGetTodos,
  useUpdateTodo,
} from "@/services/query/todos.query"

export const Route = createFileRoute("/todos")({
  component: Todos,
})

function Todos() {
  const [title, setTitle] = useState("")
  const { data: todos, isPending, error } = useGetTodos()
  const create = useCreateTodo()
  const update = useUpdateTodo()
  const remove = useDeleteTodo()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    create.mutate({ title }, { onSuccess: () => setTitle("") })
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h3>Todos (backend example)</h3>

      <form onSubmit={submit} className="flex gap-2">
        <input
          className="flex-1 rounded border px-2 py-1"
          placeholder="New todo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button type="submit" isDisabled={create.isPending}>
          Add
        </Button>
      </form>

      {isPending && <p>Loading...</p>}
      {error && (
        <p className="text-red-500">
          Could not reach the backend. Is `npm run dev:api` running?
        </p>
      )}

      <ul className="space-y-2">
        {todos?.map((todo) => (
          <li key={todo.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={todo.done}
              onChange={(e) =>
                update.mutate({ id: todo.id, data: { done: e.target.checked } })
              }
            />
            <span className={todo.done ? "flex-1 line-through" : "flex-1"}>
              {todo.title}
            </span>
            <Button
              variant="outline"
              size="sm"
              onPress={() => remove.mutate(todo.id)}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
