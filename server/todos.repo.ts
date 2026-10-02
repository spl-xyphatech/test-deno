import type { Todo } from "../src/types/todo.ts"

// In-memory placeholder. Replace the body of these functions with Postgres
// queries later; routes.ts only depends on this interface.
export type TodoRepo = {
  list(): Promise<Todo[]>
  create(title: string): Promise<Todo>
  update(
    id: number,
    patch: Partial<Pick<Todo, "title" | "done">>
  ): Promise<Todo | null>
  remove(id: number): Promise<boolean>
}

const todos = new Map<number, Todo>()
let nextId = 1

export const todoRepo: TodoRepo = {
  list() {
    return Promise.resolve([...todos.values()])
  },
  create(title) {
    const todo: Todo = {
      id: nextId++,
      title,
      done: false,
      createdAt: new Date().toISOString(),
    }
    todos.set(todo.id, todo)
    return Promise.resolve(todo)
  },
  update(id, patch) {
    const todo = todos.get(id)
    if (!todo) return Promise.resolve(null)
    const next = { ...todo, ...patch }
    todos.set(id, next)
    return Promise.resolve(next)
  },
  remove(id) {
    return Promise.resolve(todos.delete(id))
  },
}
