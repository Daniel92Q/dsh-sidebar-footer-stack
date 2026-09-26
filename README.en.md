# dsh-sidebar-footer-stack

**English** | [中文](./README.md)

Stacks the plugin cards at the bottom of the DeepSeek Harness sidebar **vertically**, gives them **uniform card chrome**, and lets you **drag them to reorder**.

> A DSH plugin (a `dsh.client` browser half plus an empty host half). Tested on DSH `0.1.7-rc.2` (desktop app).

## The problem it solves

The `sidebar.footer.action` slot is where the host lets plugins park a small always-visible card (session cost, memory entry, …). The host renders that slot's container as a **single row** of `display:flex`, so as soon as two plugins live there, each card gets half the width and its content is clipped:

```
without this plugin                 with this plugin
┌───────────┬───────────┐          ┌──────────────────────┐
│ cost card │ mem card  │          │ cost card            │
│ (squeezed)│ (squeezed)│          ├──────────────────────┤
└───────────┴───────────┘          │ memory card          │
                                   └──────────────────────┘
```

Three things it does:

| Capability | Detail |
| --- | --- |
| **Vertical stack** | Every entry in the slot becomes a full-width row. Plugins installed later are covered automatically — no code change needed. |
| **Uniform chrome** | Every entry gets a uniform card look: a `1px` border (`--dsw-alias-border-l1`), `12px` radius and the `--dsw-alias-bg-layer-1` background. **An entry that already draws its own cards does not get a second frame.** |
| **Drag to reorder** | Drag a card onto another card's upper/lower half to move it before/after. The order is stored in `localStorage` and survives reloads and restarts. |

## Install

### 1. npm

```sh
dsh plugin --profile web add dsh-sidebar-footer-stack
```

### 2. From GitHub

```sh
dsh plugin --profile web add github:Daniel92Q/dsh-sidebar-footer-stack
```

### 3. From a local clone (development)

```sh
git clone https://github.com/Daniel92Q/dsh-sidebar-footer-stack
dsh plugin --profile web add /absolute/path/to/dsh-sidebar-footer-stack
```

Replace `web` with your own profile name. **On the desktop (Electron) app, install through the in-app Plugin page** (`Settings → Plugins → Add plugin`): the official app owns the `desktop` profile and `dsh plugin --profile desktop` is refused by the CLI.

The package ships **no build scripts** (plain JS, usable as installed), so pnpm's `allowBuilds` gate never blocks it.

Restart that profile's Harness process afterwards; when installing from the UI, the refresh it offers is enough.

## Usage

| Action | Behaviour |
| --- | --- |
| Drag a card | The cursor becomes a grab handle. Drop on the target's **upper half** → before it, **lower half** → after it. With two cards those two cases are exactly a swap. |
| Drag feedback | The dragged card drops to 45% opacity; a 2px brand-coloured line marks the target edge. |
| Reset the order | Drag it back, or clear the `localStorage` key `dsh-sidebar-footer-stack.order`. |
| Collapsed sidebar | In the narrow rail the entries are centred and get no card chrome. |

## How it works

Three decisions worth reading before you change anything:

1. **Selectors match the CSS-module suffix only.**
   The same host version hashes class names differently in the app bundle (`app.asar`) and in the published npm copy — `n_2Q3W_footerActions` in the app, `hHd-Xa_footerActions` in the published one. A hard-coded full class name **matches nothing, silently**. This plugin therefore always uses `[class*="footerActions"]`.

2. **The entries are not the container's first level.**
   The host renderer puts a **class-less, 0×0 outlet element** (`display:contents`) inside the slot; the real entries are **its children**. Chrome written on the first level lands on that invisible element — which is exactly what "I changed it and nothing happened" looks like. So the card rules are written at both levels (`> *` and `> *:not([class]) > *`) and the outlet itself is explicitly stripped of border/background.

3. **Reordering uses flex `order`, not DOM moves.**
   The slot is React-rendered: moving nodes imperatively is undone by the next re-render, which restores registration order. `order` is a style React does not own, so it survives. The sequence is stored in `localStorage` against an "entry identity" — the class name, or the `data-*` attribute names when there is no class (e.g. `@a9i5k4/dsh-auto-memory`'s button is `data-dam-sidebar-btn`).

## Compatibility and failure mode

- **Tested on**: DSH `0.1.7-rc.2` (official desktop Electron app).
- It depends on two host internals: the slot container's class-name suffix `footerActions`, and the two-level "outlet element + entries" DOM.
- If a host upgrade changes either, the plugin **fails silently**: no error, the cards return to the host's own side-by-side row. It never breaks the host or your data.
- The collapsed rail's look is owned by the host and by each plugin's inline styles; this plugin only avoids overriding their centring.

## Troubleshooting (diagnostics)

Diagnostics are **off by default**. Turn them on with:

```js
localStorage.setItem('dsh-sidebar-footer-stack.debug', '1')   // then reload the page
```

The browser half then POSTs the DOM it observes (container class, `flex-direction`, each entry's class / `order` / computed border / size) to a local route on the host half, which writes it to:

```
~/.dsh/sidebar-footer-stack-probe.ndjson
```

Attach that file to an issue. It contains DOM structure and style values only — **no conversation content** — and stops growing past 1 MB.

Turn it off: `localStorage.removeItem('dsh-sidebar-footer-stack.debug')`.

## Uninstall

```sh
dsh plugin --profile <name> remove dsh-sidebar-footer-stack
```

On the desktop app, remove it from the in-app Plugin page. The cards then return to the host's own row layout.

## Development

```sh
git clone https://github.com/Daniel92Q/dsh-sidebar-footer-stack
dsh plugin --profile web add /path/to/clone     # installs into the profile as a link
# then edit lib/client.js and reload the page
```

Two facts that save time:

- A client bundle's **revision is derived from the file's `mtime/ctime/size`**, so editing the file changes the URL and the browser refetches — no app restart needed.
- The host **hot-swaps client bundles without reloading the page**, so an injected stylesheet must update its existing `<style>` element in place. The "return early when the tag already exists" form leaves the page on the previous release's CSS forever, which reads as "my edit did nothing".

## License

[MIT](./LICENSE)
