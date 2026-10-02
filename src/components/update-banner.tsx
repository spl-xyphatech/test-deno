import { useEffect, useState } from "react"

type UpdateStatus = {
  current: string | null
  readyVersion: string | null
  rolledBack: boolean
}

// Polls the desktop backend (main.ts). Silently does nothing under `vite dev`,
// where /api/update-status doesn't exist.
export function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let stop = false
    const check = async () => {
      try {
        const res = await fetch("/api/update-status", { cache: "no-store" })
        const type = res.headers.get("content-type") ?? ""
        if (res.ok && type.includes("json") && !stop) setStatus(await res.json())
      } catch {
        // not running inside the desktop app
      }
    }
    check()
    const id = setInterval(check, 5000)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [])

  if (!status || dismissed) return null

  const message = status.readyVersion
    ? `Update ${status.readyVersion} downloaded. Quit and reopen the app to apply it.`
    : status.rolledBack
      ? "The last update failed to start, so the previous version was restored."
      : null
  if (!message) return null

  return (
    <div className="flex items-center justify-between gap-4 border-b bg-muted px-4 py-2 text-sm">
      <span>
        {message}
        {status.current && (
          <span className="ml-2 text-muted-foreground">
            (running {status.current})
          </span>
        )}
      </span>
      <button className="underline" onClick={() => setDismissed(true)}>
        Dismiss
      </button>
    </div>
  )
}
