"use client"

import * as pdfjs from "pdfjs-dist"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from "pdf-lib"
import type { OverlayBundle, VideoOverlay } from "./types"

// Configure the worker once, using a CDN build matched to the installed version.
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

const ATTACHMENT_NAME = "v0-video-overlays.json"

export async function loadPdfDocument(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  // pass a copy because pdf.js transfers/detaches the buffer
  const data = bytes.slice(0)
  const task = pdfjs.getDocument({ data })
  return task.promise
}

export async function createDemoPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([612, 792])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()

  page.drawText("PDFVideoEmbedder Demo", {
    x: 72,
    y: height - 104,
    size: 28,
    font: bold,
    color: rgb(0.08, 0.09, 0.12),
  })
  page.drawText("Place a video on this page, switch to viewer mode, then export the PDF.", {
    x: 72,
    y: height - 142,
    size: 13,
    font,
    color: rgb(0.28, 0.31, 0.36),
  })

  page.drawRectangle({
    x: 72,
    y: 300,
    width: width - 144,
    height: 260,
    borderColor: rgb(0.76, 0.79, 0.84),
    borderWidth: 1,
    color: rgb(0.96, 0.97, 0.98),
  })
  page.drawText("Video area", {
    x: 96,
    y: 525,
    size: 18,
    font: bold,
    color: rgb(0.2, 0.22, 0.26),
  })
  page.drawText("Use this sample when you want to try the app without preparing a PDF file.", {
    x: 96,
    y: 500,
    size: 12,
    font,
    color: rgb(0.36, 0.39, 0.44),
  })

  return doc.save()
}

export interface PageDimension {
  width: number
  height: number
  /** width / height */
  aspect: number
}

export async function getPageDimensions(pdf: PDFDocumentProxy): Promise<PageDimension[]> {
  const dims: PageDimension[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const vp = page.getViewport({ scale: 1 })
    dims.push({ width: vp.width, height: vp.height, aspect: vp.width / vp.height })
  }
  return dims
}

export interface RenderHandle {
  cancel: () => void
}

/**
 * Render a page to a canvas. Returns a handle so the caller can cancel an
 * in-flight render before starting a new one (prevents pdf.js "same canvas"
 * errors during zoom changes or Strict Mode double-invocation).
 */
export function renderPageToCanvas(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
  canvas: HTMLCanvasElement,
): RenderHandle {
  let cancelled = false
  let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | null = null

  ;(async () => {
    const page = await pdf.getPage(pageNumber)
    if (cancelled) return
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    const viewport = page.getViewport({ scale: scale * dpr })
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    canvas.width = viewport.width
    canvas.height = viewport.height
    canvas.style.width = `${viewport.width / dpr}px`
    canvas.style.height = `${viewport.height / dpr}px`
    task = page.render({ canvasContext: ctx, viewport })
    try {
      await task.promise
    } catch (e: unknown) {
      const name = (e as { name?: string })?.name
      if (name !== "RenderingCancelledException") throw e
    }
  })().catch((e) => {
    if (!cancelled) console.error("[v0] render error", e)
  })

  return {
    cancel: () => {
      cancelled = true
      task?.cancel()
    },
  }
}

/** Try to read an embedded overlay bundle from a PDF previously exported by this app. */
export async function extractOverlayBundle(pdf: PDFDocumentProxy): Promise<OverlayBundle | null> {
  try {
    const attachments = (await pdf.getAttachments()) as Record<
      string,
      { filename: string; content: Uint8Array }
    > | null
    if (!attachments) return null
    for (const key of Object.keys(attachments)) {
      const att = attachments[key]
      if (att.filename === ATTACHMENT_NAME || key === ATTACHMENT_NAME) {
        const text = new TextDecoder().decode(att.content)
        const parsed = JSON.parse(text) as OverlayBundle
        if (parsed && parsed.version === 1 && Array.isArray(parsed.overlays)) {
          return parsed
        }
      }
    }
  } catch {
    // not all PDFs have attachments
  }
  return null
}

/**
 * Build a poster PNG (data URL) for an overlay. For file videos we capture a
 * real frame; otherwise we render a labeled placeholder with a play badge.
 */
export async function makePlaceholderPoster(label: string, w = 640, h = 360): Promise<string> {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#111827"
  ctx.fillRect(0, 0, w, h)
  // play triangle badge
  ctx.fillStyle = "rgba(255,255,255,0.92)"
  const cx = w / 2
  const cy = h / 2
  const r = Math.min(w, h) * 0.13
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#111827"
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.35, cy - r * 0.5)
  ctx.lineTo(cx - r * 0.35, cy + r * 0.5)
  ctx.lineTo(cx + r * 0.55, cy)
  ctx.closePath()
  ctx.fill()
  // label
  ctx.fillStyle = "rgba(255,255,255,0.85)"
  ctx.font = "20px sans-serif"
  ctx.textAlign = "center"
  ctx.fillText(truncate(label, 40), cx, h - 24)
  return canvas.toDataURL("image/png")
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s
}

async function dataUrlToBytes(dataUrl: string): Promise<Uint8Array> {
  const res = await fetch(dataUrl)
  const buf = await res.arrayBuffer()
  return new Uint8Array(buf)
}

/**
 * Export a new PDF: draw a poster image for each overlay at its position, add a
 * clickable link to the video source, and embed the overlay bundle as a JSON
 * attachment so this app can restore full playback later.
 */
export async function exportPdfWithVideos(
  originalBytes: Uint8Array,
  overlays: VideoOverlay[],
  posters: Record<string, string>,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(originalBytes.slice(0))
  const pages = doc.getPages()

  for (const ov of overlays) {
    const page = pages[ov.page]
    if (!page) continue
    const { width: pw, height: ph } = page.getSize()
    const x = ov.x * pw
    const w = ov.w * pw
    const h = ov.h * ph
    // overlay y is from the top; pdf-lib origin is bottom-left
    const y = ph - (ov.y * ph) - h

    // poster image
    const posterUrl = posters[ov.id]
    if (posterUrl) {
      try {
        const bytes = await dataUrlToBytes(posterUrl)
        const img = await doc.embedPng(bytes)
        page.drawImage(img, { x, y, width: w, height: h, opacity: ov.settings.opacity / 100 })
      } catch {
        page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.07, 0.09, 0.15) })
      }
    } else {
      page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.07, 0.09, 0.15) })
    }

    // clickable link annotation (for url/youtube sources)
    const linkTarget =
      ov.source.type === "file" ? undefined : ov.source.src
    if (linkTarget) {
      addLinkAnnotation(doc, page, [x, y, x + w, y + h], linkTarget)
    }
  }

  const bundle: OverlayBundle = { version: 1, overlays }
  const json = new TextEncoder().encode(JSON.stringify(bundle))
  await doc.attach(json, ATTACHMENT_NAME, {
    mimeType: "application/json",
    description: "v0 video overlay data",
  })

  return doc.save()
}

function addLinkAnnotation(
  doc: PDFDocument,
  page: ReturnType<PDFDocument["getPages"]>[number],
  rect: [number, number, number, number],
  url: string,
) {
  const ctx = doc.context
  const annot = ctx.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: rect,
    Border: [0, 0, 0],
    A: {
      Type: "Action",
      S: "URI",
      URI: PDFString.of(url),
    },
  })
  const ref = ctx.register(annot)
  const node = page.node
  const existing = node.lookup(PDFName.of("Annots"))
  if (existing && "push" in (existing as object)) {
    // @ts-expect-error PDFArray has push
    existing.push(ref)
  } else {
    node.set(PDFName.of("Annots"), ctx.obj([ref]))
  }
}
