export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } })

export const error = (message: string, status = 400) =>
  json({ error: message }, status)

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json()
    if (body && typeof body === "object" && !Array.isArray(body)) return body
  } catch {
    // fall through
  }
  throw new HttpError(400, "Body must be a JSON object")
}
