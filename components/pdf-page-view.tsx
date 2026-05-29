"use client"

import { useEffect, useRef } from "react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { renderPageToCanvas, type PageDimension } from "@/lib/pdf-utils"
import type { VideoOverlay } from "@/lib/types"
import { VideoOverlayBox } from "./video-overlay-box"

interface Props {
  pdf: PDFDocumentProxy
  pageIndex: number
  dim: PageDimension
  zoom: number
  overlays: VideoOverlay[]
  mode: "edit" | "view"
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChangeGeo: (id: string, geo: Pick<VideoOverlay, "x" | "y" | "w" | "h">) => void
  onDelete: (id: string) => void
}

export function PdfPageView({
  pdf,
  pageIndex,
  dim,
  zoom,
  overlays,
  mode,
  selectedId,
  onSelect,
  onChangeGeo,
  onDelete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const containerWidth = dim.width * zoom
  const containerHeight = dim.height * zoom

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handle = renderPageToCanvas(pdf, pageIndex + 1, zoom, canvas)
    return () => handle.cancel()
  }, [pdf, pageIndex, zoom])

  return (
    <div className="relative flex flex-col items-center">
      <span className="mb-1 text-xs text-muted-foreground">ページ {pageIndex + 1}</span>
      <div
        className="relative bg-white shadow-lg"
        style={{ width: containerWidth, height: containerHeight }}
        onPointerDown={(e) => {
          if (mode === "edit" && e.target === e.currentTarget) onSelect(null)
        }}
      >
        <canvas ref={canvasRef} className="block" />
        {overlays.map((ov) => (
          <VideoOverlayBox
            key={ov.id}
            overlay={ov}
            containerWidth={containerWidth}
            containerHeight={containerHeight}
            mode={mode}
            selected={selectedId === ov.id}
            onSelect={() => onSelect(ov.id)}
            onChange={(geo) => onChangeGeo(ov.id, geo)}
            onDelete={() => onDelete(ov.id)}
          />
        ))}
      </div>
    </div>
  )
}
