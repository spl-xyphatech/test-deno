import { error, HttpError, json, readJson } from "./http.ts"
import { todoRepo } from "./todos.repo.ts"

type Handler = (
  req: Request,
  params: Record<string, string>
) => Promise<Response> | Response

const routes: { method: string; pattern: URLPattern; handler: Handler }[] = []

function route(method: string, path: string, handler: Handler) {
  routes.push({ method, pattern: new URLPattern({ pathname: path }), handler })
}

const parseId = (params: Record<string, string>) => {
  const id = Number(params.id)
  if (!Number.isInteger(id)) throw new HttpError(400, "Invalid id")
  return id
}

route("GET", "/api/todos", async () => json(await todoRepo.list()))

route("POST", "/api/todos", async (req) => {
  const { title } = await readJson(req)
  if (typeof title !== "string" || !title.trim()) {
    throw new HttpError(400, "title is required")
  }
  return json(await todoRepo.create(title.trim()), 201)
})

route("PATCH", "/api/todos/:id", async (req, params) => {
  const body = await readJson(req)
  const patch: { title?: string; done?: boolean } = {}
  if (typeof body.title === "string") patch.title = body.title.trim()
  if (typeof body.done === "boolean") patch.done = body.done
  const todo = await todoRepo.update(parseId(params), patch)
  return todo ? json(todo) : error("Not found", 404)
})

route("DELETE", "/api/todos/:id", async (_req, params) =>
  (await todoRepo.remove(parseId(params)))
    ? json({ ok: true })
    : error("Not found", 404)
)

/** Handles every /api/* request. */
export async function handleApi(req: Request): Promise<Response> {
  const url = new URL(req.url)
  try {
    let pathMatched = false
    for (const r of routes) {
      const match = r.pattern.exec(url)
      if (!match) continue
      pathMatched = true
      if (r.method !== req.method) continue
      return await r.handler(
        req,
        match.pathname.groups as Record<string, string>
      )
    }
    return pathMatched
      ? error("Method not allowed", 405)
      : error("Not found", 404)
  } catch (e) {
    if (e instanceof HttpError) return error(e.message, e.status)
    console.error("API error:", e)
    return error("Internal server error", 500)
  }
}
