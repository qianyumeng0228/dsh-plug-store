<p align="center">
  <img src="assets/logo.svg" width="88" alt="dsh-plug-store logo">
</p>

# dsh-plug-store

English | [中文](README.zh.md)

[![npm](https://img.shields.io/npm/v/dsh-plug-store)](https://www.npmjs.com/package/dsh-plug-store)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![catalog](https://img.shields.io/badge/catalog-29,593_plugins-blue)](https://qianyumeng0228.github.io/dsh-store/)

A plugin marketplace **inside** DeepSeek Harness. It renders the
[dsh-store](https://github.com/qianyumeng0228/dsh-store) catalog as a section of the host's
Settings page and performs **real** install / update / uninstall / backup by driving the
`dsh plugin` CLI — not "copy this command" placeholders.

29,593 community plugins in the catalog, 14,344 of them one-click ready, Chinese-first
descriptions, live progress on every operation, and a task log that survives a restart.

## Install

```sh
# npm release
dsh plugin --profile <profile> add dsh-plug-store

# or straight from GitHub — no build step, zero runtime dependencies
dsh plugin --profile <profile> add github:qianyumeng0228/dsh-plug-store
```

> **npm currently publishes 0.1.21.** The GitHub source is always current and carries
> the last five fixes; prefer the `github:` form above until the npm release catches up.

Restart the host afterwards, or let profile HMR pick it up: the plugin declares a bundle, so
`dsh.bundle.patch` usually reloads it without a restart.

- **DSH Desktop**: install through the app's own plugin manager. Running the CLI with
  `--profile web` on a desktop machine writes into `profiles/web`, which the Desktop app does not
  load — the entry will simply never appear.
- **Which profile it acts on** is resolved in this order: `profile` in the plugin config → the
  directory the plugin itself is installed in (`~/.dsh/profiles/<profile>/…`) → `DSH_PROFILE` →
  `web`. Installing into `desktop` therefore operates on `desktop`.

**Requires a cordis-based DSH host** (developed and verified against 0.2.1-rc.2; peer
`@deepseek-ai/cordis ^4.0.1`). On an unsupported host the section does not mount.

## Where it shows up

**Settings → Plugin Store** (设置页 → 插件商店), registered through the host's
`settings.section` slot. The UI is also served at `/dsh-store/` on the host's loopback port, so
you can open it directly in a browser.

## What you get

- **Real installs, not command snippets** — every action shells out to `dsh plugin` against the
  correct profile and reports what actually happened. `pnpm` answers "Already up to date" with
  exit code 0 when asked to re-add a pinned dependency, so an update explicitly carries the target
  version and then re-reads what is installed: the UI says *updated* only when a version really
  moved, and says *nothing changed* when it did not.
- **Live progress and a task log** — operations run as queued tasks fed by pnpm's `ndjson`
  reporter (resolving / downloading / linking / building, current package, byte counts). Failures
  are mapped from 13 `ERR_PNPM_*` codes to plain-language hints. The log persists to
  `~/.dsh/store-data/tasks.json`, survives a restart (interrupted tasks are reported as
  interrupted rather than silently disappearing), and completed or failed rows can be cleared in
  one click.
- **"Updatable" is computed against your machine** — installed version versus the catalog target,
  not a flag in the data. Locally linked and other non-registry dependencies (`file:`, `link:`,
  `workspace:`, `git+…`) are excluded, so they are never offered an update that would overwrite
  them.
- **Chinese-first catalog** — descriptions prefer Chinese; entries that exist only in English are
  machine-translated at build time (99% of the shipped catalog), and anything still missing is
  translated in page on demand. The 中 / EN toggle appears only when two genuine languages exist.
- **Themes as a preview wall** — theme cards show real screenshots extracted from each repository
  README (relative paths resolved against `raw.githubusercontent.com`, `blob` links rewritten),
  landscape shots only, click for a lightbox with prev/next.
- **Browsing that scales** — real pagination (24/48/96 per page, remembered), 17 bilingual
  categories, search across name / description / tags, filters (installable / official / new this
  week / updatable / favorites / installed), seven sort orders including random, card and list
  views, collapsible "recently added" and "most installed" rails, and a bottom queue bar that
  batches installs into one confirmed run.
- **Favorites, blocklist, backup, diagnostics** — bookmarks and hidden entries stay in your
  browser; backup exports the profile's installed list plus its `cordis` patch as readable JSON
  for migration; diagnostics checks the `dsh` CLI, the profile directory, the data source and the
  live layout of the embedded page.
- **One scrollbar, not two** — the page is embedded as an iframe stretched to its exact content
  height while the host's settings column owns all scrolling. Overlay layers (detail modal, queue
  bar, toast, lightbox) are re-anchored to the visible window on every scroll, and the stretch
  measurement reads the real content end rather than `scrollHeight`, so the frame also shrinks
  back when you move to a shorter tab.

## Data

The catalog is built daily by
[`qianyumeng0228/dsh-store`](https://github.com/qianyumeng0228/dsh-store) and published to GitHub
Pages. This plugin reads it through its own same-origin route (`/dsh-store/data/plugins.json`),
which caches the snapshot at `~/.dsh/store-data/plugins.json` for 24 hours and refreshes in the
background once stale — opening the store stays fast and does not depend on the CDN being
reachable at that moment. Responses are gzip-negotiated with a weak ETag.

The snapshot is deliberately **not** vendored into the package: shipping it would freeze a copy
that goes stale daily, and the cache above already gives the same first-paint speed.

## Host API

All routes live under `/dsh-store/`; the `api/*` ones are guarded (see Security).

| Route | Purpose |
|---|---|
| `GET /api/capabilities` | feature discovery; the UI switches into host mode on seeing it |
| `GET /api/installed` | installed package names, versions, kinds and source repos |
| `POST /api/install` | `{source:"npm",name,version?}` or `{source:"github",repo,ref?}` → `202 {taskId}` |
| `POST /api/update` | same payload; returns `from` / `to` / `changed` |
| `POST /api/uninstall` | real removal, two-step confirmation in the UI |
| `GET /api/tasks` | queued, running and finished tasks with progress |
| `POST /api/tasks/clear` | drop completed and failed rows only |
| `GET /api/backup` | profile plugin list plus cordis patch as JSON |
| `GET /api/diagnose` | CLI, profile, data source and embedded-layout health |
| `GET /data/plugins.json` | catalog proxy with local cache and remote fallback |

Identifiers are validated before anything reaches the CLI: npm sources must be package names,
GitHub sources must be a full `owner/repo` (a bare repo tail would build an invalid
`github:dsh-xxx`), and any value starting with `-` is rejected so it cannot be parsed as an
option.

`GET /api/installed` returns both names and details, because the catalog's display name and your
machine's dependency key often differ (`yujunzhixue-dsh-purge` in the catalog is `dsh-purge` on
disk) — matching on either alone silently loses half the installed list.

## Security

- API routes require a **loopback `Host`** (`localhost` / `127.0.0.1` / `[::1]`) **plus** a custom
  `x-dsh-store: 1` header — a cross-site page cannot set that header without a preflight it will
  lose. The page itself and the catalog stay open, because they are public data.
- **Zero runtime dependencies**, and no telemetry: the only outbound request is the catalog fetch.
- The plugin reads no credentials. It writes only inside `~/.dsh/profiles/<profile>/` (through
  `dsh plugin`) and `~/.dsh/store-data/` (its own task log and data cache).
- Install sources are limited to catalog entries; the store does not accept an arbitrary URL as a
  plugin source.
- Plugins from git sources may need build-script approval (`allowBuilds`) in the host; the queue
  surfaces that instead of hiding it.
- Listing is not endorsement. Every entry is third-party code — install what you trust.

## Configuration

```yaml
plugins:
  dsh-plug-store:
    profile: desktop     # omit to auto-detect from the install path
    # path: /dsh-store   # route prefix
    # dataUrl: https://qianyumeng0228.github.io/dsh-store/data/plugins.json
```

## Repository layout

```
dsh-plug-store/
├── index.js              # host side: /dsh-store/* routes + dsh CLI child processes (no deps)
├── cordis.patch.yml      # bundle declaration consumed by dsh.bundle.patch
├── client-src/index.js   # client source (React)
├── client/client.js      # hand-maintained bundle of the above
├── site/index.html       # store UI — byte-identical copy of the upstream file
├── assets/logo.svg       # brand mark
└── .github/workflows/    # sync-upstream.yml keeps site/index.html current
```

## Development

```sh
npm install      # dev-only tooling (esbuild + react); neither is shipped in the package
npm run check    # node --check index.js
```

Two rules that have each caused a shipped bug:

- `client/client.js` is a **hand-maintained bundle**. Inside it React is referenced as
  `import_react.default`; pasting `React.useState` / `React.createElement` from `client-src`
  produces a blank panel. Change both files together.
- `site/index.html` is a byte-for-byte copy of the file in
  [`qianyumeng0228/dsh-store`](https://github.com/qianyumeng0228/dsh-store), which is the single
  source of truth for the UI. Host-specific behaviour is detected at runtime inside that same
  file, so the two copies must stay identical: edit upstream, then sync.

## Troubleshooting

| Symptom | Cause |
|---|---|
| The section never appears | installed into a profile the running host does not load (see Install) |
| Store panel is blank | `client/client.js` out of sync with `client-src/index.js` |
| Update "succeeded" but nothing changed | an update path without an explicit version — see *What you get* |
| Task list empty after a restart | it was cleared; in-flight tasks are kept and marked interrupted |
| Catalog looks a day old | local cache; run **Advanced → diagnostics**, or delete `~/.dsh/store-data/plugins.json` to force a refresh |

## Submitting a plugin

This repository is the marketplace app, not the catalog. Listings are produced by the
[`dsh-store`](https://github.com/qianyumeng0228/dsh-store) pipeline — seed registries, GitHub
topic scan, npm keyword crawl, each entry checked for `package.json#dsh` evidence. To get a plugin
listed, or to report a wrong entry, open an issue there; the store's **Submit** tab builds a
pre-filled one.

## License

MIT
