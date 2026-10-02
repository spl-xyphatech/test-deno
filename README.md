# React + TypeScript + Vite + shadcn/ui

This is a template for a new Vite project with React, TypeScript, and shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `src/components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```

## Desktop app (Deno + webview)

The app is packaged with `deno desktop` using the system webview (WKWebView on
macOS). [main.ts](main.ts) is the entry point: it serves the built `dist/`
folder and runs auto-update. `deno desktop .` must **not** be used, because it
auto-detects Vite and ignores `main.ts`.

```bash
npm run desktop       # vite build must have run first; output: out/DenoVite.app
npm run desktop:run   # build and open
```

The app is about 66 MB. `node_modules` is excluded from the bundle on purpose.

## Auto-update

Auto-update uses Deno's built-in `Deno.autoUpdate()` (macOS and Linux only,
Windows is not supported yet). It runs in the background, with no UI of its own.

### How it works

1. The installed app fetches `latest.json` from the update URL on launch and
   then on an interval (set in `main.ts`).
2. If the version is newer, it downloads a small binary patch (`bsdiff`) made
   for the version the user is running, checks its SHA-256, and applies it to
   its own `libruntime.dylib` (the 68 MB file inside the app that holds the
   Deno runtime and our code).
3. The patched dylib is staged as `libruntime.dylib.update`. It takes effect the
   **next time the app is launched**.
4. If the new version crashes at startup, the launcher restores
   `libruntime.dylib.backup` automatically.

The UI shows a banner when an update is ready (`src/components/update-banner.tsx`,
fed by `/api/update-status` in `main.ts`). `Deno.autoUpdate` reports no download
progress.

### Where things live

| What | Where | Used by |
| --- | --- | --- |
| `latest.json` + `patch-X-to-Y.bin` | `updates` branch of the repo, read via `https://raw.githubusercontent.com/spl-xyphatech/test-deno/updates` | Installed apps |
| Zipped app + each version's `libruntime-X.dylib` | GitHub Releases (`vX.Y.Z`) | New installs, and building future patches |

The update URL is `desktop.release.baseUrl` in [deno.json](deno.json). It is
baked into every installed app and **cannot be changed for existing users**.

GitHub Releases cannot serve the update files: `Deno.autoUpdate` refuses
redirects and release download URLs always redirect.

### Publishing a new version

Requires `gh` (logged in) and `bsdiff` (`brew install gh bsdiff`).

```bash
deno run -A scripts/release.ts --publish          # 1.6.0 -> 1.6.1 (default)
deno run -A scripts/release.ts minor --publish    # 1.6.1 -> 1.7.0
deno run -A scripts/release.ts 2.0.0 --publish    # exact version
```

Without `--publish` it only builds and writes the files to `.release/out/`.

With `--publish`, the script:

1. bumps `version` in `deno.json`,
2. builds the app (`npm run build`, `npm run desktop`),
3. stores the new dylib in `.release/dylibs/` and downloads any missing older
   dylibs from earlier GitHub Releases,
4. makes a patch from **every** older version to the new one and writes
   `latest.json`,
5. creates the GitHub Release `vX.Y.Z` with `DenoVite-X.Y.Z-macos-arm64.zip` and
   `libruntime-X.Y.Z.dylib`,
6. pushes `latest.json` and the patches to the `updates` branch.

It can also run in CI: Actions tab, **Release**, **Run workflow**
(`.github/workflows/release.yml`). The repo needs "Read and write permissions"
under Settings, Actions, General, Workflow permissions. The workflow commits
the bumped `deno.json` back to `main`, so `main` must allow that.

### Rules

- **Never rebuild and republish a version that is already published.** A patch
  only applies to the exact bytes users have, so always bump the version.
- **Keep every old dylib.** A user can only update if the manifest has a patch
  from their exact version. Releases before v1.6.0 have no dylib attached, so
  users on those versions need a fresh install.
- **Do not delete `.release/dylibs/`** unless the dylibs are all attached to
  GitHub Releases.
- Changes to the launcher (`laufey_webview`), app icon or bundle settings cannot
  be shipped as an update. Those need a fresh install.
- Intel Macs need their own build and manifest. The script is arm64 only.

### Testing an update locally

1. Install the current version: `cp -R out/DenoVite.app /Applications/`.
2. Change something visible, then run the release command above.
3. Run `/Applications/DenoVite.app/Contents/MacOS/laufey_webview` in a terminal.
   `Update X.Y.Z ready; will apply on next launch` means the patch is staged.
   (Output from `open` or Finder is not visible.)
4. Quit and open the app again to see the new version.

`raw.githubusercontent.com` caches files for about 5 minutes, so right after
publishing the app may still see the old manifest and log
`no patch available for A -> B`. Wait and retry.

### Before production

- The check interval in `main.ts` is 1 second for testing. Set it to something
  like an hour.
- `raw.githubusercontent.com` is fine for testing. For production use a host
  without the 5-minute cache (GitHub Pages, R2, S3) behind a domain you control,
  because the URL cannot change later.
- Sign the manifest: pass `publicKey` (Ed25519) to `autoUpdate`.
- Sign and notarize the app. It is only ad-hoc signed, so other Macs show a
  Gatekeeper warning.
