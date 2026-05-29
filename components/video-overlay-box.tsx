"use client"

import type React from "react"
import { useRef } from "react"
import { Trash2, Move } from "lucide-react"
import { cn } from "@/lib/utils"
import type { VideoOverlay } from "@/lib/types"
import { VideoContent } from "./video-content"

type Geo = Pick<VideoOverlay, "x" | "y" | "w" | "h">

interface Props {
  overlay: VideoOverlay
  containerWidth: number
  containerHeight: number
  mode: "edit" | "view"
  selected: boolean
  onSelect: () => void
  onChange: (geo: Geo) => void
  onDelete: () => void
}

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"]

const MIN = 0.04 // minimum size as fraction

export function VideoOverlayBox({
  overlay,
  containerWidth,
  containerHeight,
  mode,
  selected,
  onSelect,
  onChange,
  onDelete,
}: Props) {
  const startRef = useRef<{
    px: number
    py: number
    geo: Geo
    mode: "move" | Handle
  } | null>(null)

  const left = overlay.x * containerWidth
  const top = overlay.y * containerHeight
  const width = overlay.w * containerWidth
  const height = overlay.h * containerHeight

  function beginDrag(e: React.PointerEvent, dragMode: "move" | Handle) {
    if (mode !== "edit") return
    e.preventDefault()
    e.stopPropagation()
    onSelect()
    startRef.current = {
      px: e.clientX,
      py: e.clientY,
      geo: { x: overlay.x, y: overlay.y, w: overlay.w, h: overlay.h },
      mode: dragMode,
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  function onMove(e: PointerEvent) {
    const s = startRef.current
    if (!s) return
    const dx = (e.clientX - s.px) / containerWidth
    const dy = (e.clientY - s.py) / containerHeight
    let { x, y, w, h } = s.geo

    if (s.mode === "move") {
      x = clamp(s.geo.x + dx, 0, 1 - w)
      y = clamp(s.geo.y + dy, 0, 1 - h)
    } else {
      const m = s.mode
      if (m.includes("e")) w = clamp(s.geo.w + dx, MIN, 1 - s.geo.x)
      if (m.includes("s")) h = clamp(s.geo.h + dy, MIN, 1 - s.geo.y)
      if (m.includes("w")) {
        const nx = clamp(s.geo.x + dx, 0, s.geo.x + s.geo.w - MIN)
        w = s.geo.x + s.geo.w - nx
        x = nx
      }
      if (m.includes("n")) {
        const ny = clamp(s.geo.y + dy, 0, s.geo.y + s.geo.h - MIN)
        h = s.geo.y + s.geo.h - ny
        y = ny
      }
    }
    onChange({ x, y, w, h })
  }

  function onUp() {
    startRef.current = null
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("pointerup", onUp)
  }

  return (
    <div
      className={cn(
        "absolute",
        mode === "edit" && "cursor-move",
        mode === "edit" && selected
          ? "ring-2 ring-primary"
          : mode === "edit"
            ? "ring-1 ring-primary/40 hover:ring-primary"
            : "",
      )}
      style={{ left, top, width, height, borderRadius: overlay.settings.radius }}
      onPointerDown={(e) => beginDrag(e, "move")}
      role={mode === "edit" ? "button" : undefined}
      aria-label={mode === "edit" ? `動画: ${overlay.source.name}` : undefined}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ borderRadius: overlay.settings.radius }}>
        <VideoContent overlay={overlay} interactive={mode === "view"} />
      </div>

      {/* In edit mode, block media interaction so dragging works */}
      {mode === "edit" && (
        <div className="absolute inset-0" style={{ borderRadius: overlay.settings.radius }} />
      )}

      {mode === "edit" && selected && (
        <>
          {/* move grip + delete */}
          <div className="absolute -top-9 left-0 flex items-center gap-1">
            <span className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
              <Move className="size-3" />
              {Math.round(overlay.w * 100)}%×{Math.round(overlay.h * 100)}%
            </span>
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onDelete()
              }}
              className="flex size-7 items-center justify-center rounded-md bg-destructive text-white transition hover:opacity-90"
              aria-label="この動画を削除"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>

          {HANDLES.map((hdl) => (
            <span
              key={hdl}
              onPointerDown={(e) => beginDrag(e, hdl)}
              className={cn(
                "absolute z-10 size-3 rounded-full border-2 border-primary bg-background",
                handlePosition[hdl],
                handleCursor[hdl],
              )}
            />
          ))}
        </>
      )}
    </div>
  )
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), Math.max(min, max))
}

const handlePosition: Record<Handle, string> = {
  nw: "-left-1.5 -top-1.5",
  n: "left-1/2 -top-1.5 -translate-x-1/2",
  ne: "-right-1.5 -top-1.5",
  e: "-right-1.5 top-1/2 -translate-y-1/2",
  se: "-right-1.5 -bottom-1.5",
  s: "left-1/2 -bottom-1.5 -translate-x-1/2",
  sw: "-left-1.5 -bottom-1.5",
  w: "-left-1.5 top-1/2 -translate-y-1/2",
}

const handleCursor: Record<Handle, string> = {
  nw: "cursor-nwse-resize",
  n: "cursor-ns-resize",
  ne: "cursor-nesw-resize",
  e: "cursor-ew-resize",
  se: "cursor-nwse-resize",
  s: "cursor-ns-resize",
  sw: "cursor-nesw-resize",
  w: "cursor-ew-resize",
}
