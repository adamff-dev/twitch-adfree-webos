# AGENTS.md

## Project

Twitch AdFree — a webOS (LG TV) app that wraps the Twitch web client to block
ads, auto-claim channel points, unlock subscriber-only VODs, add 7TV/BTTV
emotes and chat overlay, etc. Based on
[webosbrew/youtube-webos](https://github.com/webosbrew/youtube-webos).

- App id: `twitch.adamffdev.v1`
- Source: JavaScript (ES modules). Bundled with webpack + Babel, linted with
  ESLint, formatted with Prettier, type-checked with `tsc -b` (checkJs).
- Remotes:
  - `origin` → https://github.com/adamff-dev/twitch-adfree-webos (push here)
  - `upstream` → https://github.com/webosbrew/youtube-webos (base project)
- Default branch: `main`.

The worker patch (`src/scripts/patch_amazon_worker.js`) is fetched at runtime
from **GitHub Pages, served from the `main` branch**:
`https://adamff-dev.github.io/twitch-adfree-webos/src/scripts/patch_amazon_worker.js?v=<APP_VERSION>`
So changes to that file only reach users after they are pushed to `main`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run lint` | ESLint over the repo |
| `npm run type-check` | `tsc -b` (JS type checking) |
| `npm run prettier-check` | Prettier check over the repo |
| `npm run build` | webpack production build → `dist/` |
| `npm run package` | `ares-package -n dist` → `.ipk` in the repo root |
| `npm run manifest` | generate `twitch.adamffdev.v1.manifest.json` (needs the ipk) |
| `npm run version` | sync `assets/appinfo.json` version from `package.json` + `git add` |
| `npm run deploy` | install the ipk to a configured webOS device |
| `npm run launch` | launch the app on the device |
| `npm run inspect` | open the webOS inspector |

`npm run package` / `deploy` / `launch` / `inspect` require the LG webOS CLI
(`ares-*`, provided by `@webos-tools/cli`).

## Versioning

The version lives in three places; keep them in sync:

1. `package.json` `version` — source of truth.
2. `src/constants/global.constants.js` `APP_VERSION` — **manual** (it is *not*
   generated). Used to cache-bust the remote patch loader, so bump it too.
3. `assets/appinfo.json` `version` — regenerated from `package.json` by
   `node tools/sync-version.cjs` (a.k.a. `npm run version`).

Bump procedure:

```sh
# 1. bump package.json (manual edit or: npm version patch --no-git-tag-version)
# 2. edit src/constants/global.constants.js -> APP_VERSION
node tools/sync-version.cjs      # 3. propagate into assets/appinfo.json
git add package.json src/constants/global.constants.js assets/appinfo.json
git commit -m "bump version to X.Y.Z"
```

`assets/appinfo.json` is tracked; `*.ipk` and `*.manifest.json` are **not**
(they are build artifacts, see `.gitignore`).

## Building the ipk and manifest

```sh
npm run build       # webpack (production) -> dist/
npm run package     # ares-package -n dist -> twitch.adamffdev.v1_<version>_all.ipk
npm run manifest    # tools/gen-manifest.cjs -> twitch.adamffdev.v1.manifest.json
```

- `npm run package` packages `dist/` into
  `twitch.adamffdev.v1_<version>_all.ipk` (id/version read from
  `dist/appinfo.json`) in the repo root.
- `npm run manifest` (`tools/gen-manifest.cjs`) reads `assets/appinfo.json` for
  `id`/`version`/`title`, computes the SHA-256 of the built
  `twitch.adamffdev.v1_<version>_all.ipk`, and writes
  `twitch.adamffdev.v1.manifest.json` (`ipkUrl` + `ipkHash.sha256`).
- **Rebuild the ipk before regenerating the manifest** and re-run
  `npm run manifest` whenever the ipk changes — the hash must match the file.
- `.ipk` and `.manifest.json` are gitignored. They are not committed; attach
  the ipk to a GitHub release and publish the manifest (consumed by the
  Homebrew Channel / Device Manager app catalog).

## Known pre-existing issues

These fail on a clean checkout and are unrelated to most changes:

- `npm run type-check` → `eslint.config.js(7,1): error TS2578: Unused
  '@ts-expect-error' directive.`
- `npm run prettier-check` flags `pnpm-lock.yaml`, `src/scripts/emotes.js`,
  `twitch.adamffdev.v1.manifest.json`.

## Conventions

- Do **not** add code comments unless they are needed.
- ESLint enforces `no-await-in-loop` (add `// eslint-disable-next-line
  no-await-in-loop` when intentional), `no-implicit-globals`,
  `arrow-body-style: as-needed`, and `reportUnusedDisableDirectives` (unused
  `eslint-disable` comments are errors).
- Never commit secrets or credentials.
