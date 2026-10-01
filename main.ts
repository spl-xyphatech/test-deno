const dist = new URL("./dist/", import.meta.url)

// Polls `<desktop.release.baseUrl>/latest.json` (see deno.json), stages a
// binary patch, and applies it on next launch. No-op when not running as a
// compiled desktop app (Deno.desktopVersion is null). macOS/Linux only.
const { autoUpdate } = Deno as unknown as {
  autoUpdate?: (opts: {
    url?: string
    interval?: number
    publicKey?: string
    onUpdateReady?: (version: string) => void
    onRollback?: (reason: unknown) => void
  }) => void
}

autoUpdate?.({
  interval: 60 * 60 * 1000,
  onUpdateReady(version) {
    console.log(`Update ${version} ready; will apply on next launch`)
  },
  onRollback(reason) {
    console.warn("Previous launch failed; rolled back:", reason)
  },
})

Deno.serve(async (req) => {
  const url = new URL(req.url)

  let path = decodeURIComponent(url.pathname)

  if (path === "/") {
    path = "/index.html"
  }

  const file = new URL(`.${path}`, dist)

  try {
    const data = await Deno.readFile(file)

    const contentType = path.endsWith(".html")
      ? "text/html"
      : path.endsWith(".js")
        ? "text/javascript"
        : path.endsWith(".css")
          ? "text/css"
          : path.endsWith(".svg")
            ? "image/svg+xml"
            : path.endsWith(".png")
              ? "image/png"
              : path.endsWith(".jpg") || path.endsWith(".jpeg")
                ? "image/jpeg"
                : "application/octet-stream"

    return new Response(data, {
      headers: {
        "content-type": contentType,
      },
    })
  } catch {
    // SPA fallback
    const index = await Deno.readFile(new URL("./index.html", dist))

    return new Response(index, {
      headers: {
        "content-type": "text/html",
      },
    })
  }
})
