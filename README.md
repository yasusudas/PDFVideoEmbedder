# PDFVideoEmbedder

PDFVideoEmbedder is a local-first Next.js app for placing playable video overlays on PDF pages and exporting a PDF that preserves the overlay metadata.

## Features

- Open a PDF in the browser and render each page with pdf.js.
- Add videos from local files, direct video URLs, or YouTube links.
- Drag and resize overlays in edit mode.
- Preview playback in viewer mode.
- Export a PDF with poster images, URL link annotations, and embedded overlay JSON for restoration in this app.

## Requirements

- Node.js 24 or newer
- pnpm 11 or newer

## Setup

```bash
pnpm install --frozen-lockfile
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
```

`pnpm-workspace.yaml` approves the native build scripts used by `canvas`, `sharp`, and `unrs-resolver` so installs can run non-interactively with pnpm 11.
