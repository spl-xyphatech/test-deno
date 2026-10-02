import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createTodo, deleteTodo, getTodos, updateTodo } from "../api/todos.api"
import type { Todo } from "@/types/todo"

export const todoKeys = {
  all: ["todos"] as const,
  list: () => [...todoKeys.all, "list"] as const,
}

export function useGetTodos() {
  return useQuery({
    queryKey: todoKeys.list(),
    queryFn: getTodos,
    select: (res) => res.data,
  })
}

export function useCreateTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTodo,
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
  })
}

export function useUpdateTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Partial<Pick<Todo, "title" | "done">>
    }) => updateTodo(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
  })
}

export function useDeleteTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
  })
}
