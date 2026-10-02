import { api } from "@/lib/api-client"
import type { Todo } from "@/types/todo"

export const getTodos = () => api.get<Todo[]>("/todos")

export const createTodo = (data: { title: string }) =>
  api.post<Todo>("/todos", data)

export const updateTodo = (
  id: number,
  data: Partial<Pick<Todo, "title" | "done">>
) => api.patch<Todo>(`/todos/${id}`, data)

export const deleteTodo = (id: number) => api.delete(`/todos/${id}`)
