// Usage: deno run -A scripts/release.ts [<version>|patch|minor|major] [--publish]
// With no version (or `patch`), bumps the patch number: 1.6.0 -> 1.6.1.
//
// Bumps deno.json version, builds the desktop app, stores the dylib for this
// version under .release/dylibs/, generates bsdiff patches from every earlier
// stored version, and writes .release/out/latest.json.
// With --publish, commits the out/ files to the `updates` branch of REPO; the app
// reads them via raw.githubusercontent.com (GitHub release URLs redirect, and
// Deno.autoUpdate refuses redirects).
// Also attaches a zipped app and this version's dylib to a GitHub release
// (needs `gh`), and fetches missing older dylibs from earlier releases.
// macOS arm64 only.

const publish = Deno.args.includes("--publish")
const bump = Deno.args.find((a) => !a.startsWith("--")) ?? "patch"

const root = new URL("../", import.meta.url).pathname
const configPath = `${root}deno.json`
const config = JSON.parse(await Deno.readTextFile(configPath))

function nextVersion(current: string, arg: string) {
  if (/^\d+\.\d+\.\d+$/.test(arg)) return arg
  const [major, minor, patch] = current.split(".").map(Number)
  if (arg === "patch") return `${major}.${minor}.${patch + 1}`
  if (arg === "minor") return `${major}.${minor + 1}.0`
  if (arg === "major") return `${major + 1}.0.0`
  console.error(
    "Usage: deno run -A scripts/release.ts [<x.y.z>|patch|minor|major] [--publish]"
  )
  Deno.exit(1)
}
const version = nextVersion(config.version, bump)
console.log(`Releasing ${config.version} -> ${version}`)

const REPO = "spl-xyphatech/test-deno"
const BRANCH = "updates"

const dylibsDir = `${root}.release/dylibs`
const outDir = `${root}.release/out`
const assetsDir = `${root}.release/assets`

async function run(cmd: string, args: string[], cwd = root) {
  const { code } = await new Deno.Command(cmd, {
    args,
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  }).output()
  if (code !== 0) throw new Error(`${cmd} ${args.join(" ")} failed (${code})`)
}

async function sha256(path: string) {
  const buf = await crypto.subtle.digest("SHA-256", await Deno.readFile(path))
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// 1. bump version (it is baked into the build)
config.version = version
await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2) + "\n")

// 2. build
await run("npm", ["run", "build"])
await run("npm", ["run", "desktop"])

// 3. store this version's dylib
await Deno.mkdir(dylibsDir, { recursive: true })
const newDylib = `${dylibsDir}/${version}.dylib`
await Deno.copyFile(
  `${root}out/DenoVite.app/Contents/MacOS/libruntime.dylib`,
  newDylib
)

// 3b. fetch older dylibs we don't have locally from earlier GitHub releases
if (publish) {
  const list = await new Deno.Command("gh", {
    args: [
      "release",
      "list",
      "-R",
      REPO,
      "--json",
      "tagName",
      "-q",
      ".[].tagName",
    ],
    stdout: "piped",
    stderr: "inherit",
  }).output()
  for (const tag of new TextDecoder().decode(list.stdout).split("\n")) {
    const v = tag.replace(/^v/, "")
    if (!/^\d+\.\d+\.\d+$/.test(v) || v === version) continue
    const local = `${dylibsDir}/${v}.dylib`
    if (
      await Deno.stat(local).then(
        () => true,
        () => false
      )
    )
      continue
    try {
      await run("gh", [
        "release",
        "download",
        tag,
        "-R",
        REPO,
        "-p",
        `libruntime-${v}.dylib`,
        "-O",
        local,
      ])
      console.log(`Fetched ${v} dylib from release ${tag}`)
    } catch {
      console.log(`No dylib asset on release ${tag}; skipping`)
    }
  }
}

// 4. patches from every earlier version
await Deno.remove(outDir, { recursive: true }).catch(() => {})
await Deno.mkdir(outDir, { recursive: true })
const patches: Record<string, { name: string; sha256: string }> = {}
for await (const entry of Deno.readDir(dylibsDir)) {
  const from = entry.name.replace(/\.dylib$/, "")
  if (from === version) continue
  const name = `patch-${from}-to-${version}.bin`
  await run("bsdiff", [
    `${dylibsDir}/${entry.name}`,
    newDylib,
    `${outDir}/${name}`,
  ])
  patches[from] = { name, sha256: await sha256(`${outDir}/${name}`) }
}

// 5. manifest
await Deno.writeTextFile(
  `${outDir}/latest.json`,
  JSON.stringify({ version, patches }, null, 2) + "\n"
)
console.log(`\nOut: ${outDir}`)
console.log(
  `Patches: ${Object.keys(patches).join(", ") || "(none, first release)"}`
)

// 6. publish
if (publish) {
  // archive + new-install assets on a GitHub release
  await Deno.remove(assetsDir, { recursive: true }).catch(() => {})
  await Deno.mkdir(assetsDir, { recursive: true })
  const zip = `${assetsDir}/DenoVite-${version}-macos-arm64.zip`
  await run("ditto", [
    "-c",
    "-k",
    "--keepParent",
    `${root}out/DenoVite.app`,
    zip,
  ])
  const dylibAsset = `${assetsDir}/libruntime-${version}.dylib`
  await Deno.copyFile(newDylib, dylibAsset)
  await run("gh", [
    "release",
    "create",
    `v${version}`,
    zip,
    dylibAsset,
    "-R",
    REPO,
    "--title",
    `v${version}`,
    "--notes",
    `Release ${version}`,
  ])

  const repoDir = `${root}.release/repo`
  // CI has no SSH key: push over HTTPS with the workflow token instead.
  const token = Deno.env.get("GH_TOKEN")
  const remote = token
    ? `https://x-access-token:${token}@github.com/${REPO}.git`
    : `git@github.com:${REPO}.git`
  const exists = await Deno.stat(repoDir).then(
    () => true,
    () => false
  )
  if (!exists) {
    try {
      await run("git", [
        "clone",
        "--branch",
        BRANCH,
        "--single-branch",
        remote,
        repoDir,
      ])
    } catch {
      await Deno.mkdir(repoDir, { recursive: true })
      await run("git", ["init"], repoDir)
      await run("git", ["checkout", "--orphan", BRANCH], repoDir)
      await run("git", ["remote", "add", "origin", remote], repoDir)
    }
  }
  if (Deno.env.get("CI")) {
    await run("git", ["config", "user.name", "github-actions[bot]"], repoDir)
    await run("git", ["config", "user.email", "github-actions[bot]@users.noreply.github.com"], repoDir)
  }
  for (const e of Deno.readDirSync(outDir)) {
    await Deno.copyFile(`${outDir}/${e.name}`, `${repoDir}/${e.name}`)
  }
  await run("git", ["add", "-A"], repoDir)
  await run("git", ["commit", "-m", `Release ${version}`], repoDir)
  await run("git", ["push", "-u", "origin", BRANCH], repoDir)
  console.log(
    `Published: https://raw.githubusercontent.com/${REPO}/${BRANCH}/latest.json`
  )
}
