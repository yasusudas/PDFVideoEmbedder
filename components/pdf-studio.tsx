"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import {
  FileUp,
  Plus,
  Pencil,
  Eye,
  ZoomIn,
  ZoomOut,
  Download,
  Film,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  loadPdfDocument,
  getPageDimensions,
  extractOverlayBundle,
  exportPdfWithVideos,
  makePlaceholderPoster,
  createDemoPdfBytes,
  type PageDimension,
} from "@/lib/pdf-utils"
import { defaultSettings, type VideoOverlay, type VideoSettings, type VideoSource } from "@/lib/types"
import { PdfPageView } from "./pdf-page-view"
import { PropertiesPanel } from "./properties-panel"
import { AddVideoDialog } from "./add-video-dialog"

type Mode = "edit" | "view"

export function PdfStudio() {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [pdfName, setPdfName] = useState("")
  const [dims, setDims] = useState<PageDimension[]>([])
  const [overlays, setOverlays] = useState<VideoOverlay[]>([])
  const [mode, setMode] = useState<Mode>("edit")
  const [zoom, setZoom] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [exporting, setExporting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])

  const selected = overlays.find((o) => o.id === selectedId) || null

  const openPdfBytes = useCallback(async (buf: Uint8Array, name: string) => {
    const doc = await loadPdfDocument(buf)
    const pageDims = await getPageDimensions(doc)
    const bundle = await extractOverlayBundle(doc)
    setPdf(doc)
    setPdfBytes(buf)
    setPdfName(name)
    setDims(pageDims)
    setOverlays(bundle?.overlays ?? [])
    setSelectedId(null)
    setCurrentPage(0)
    if (bundle?.overlays.length) {
      toast.success(`${bundle.overlays.length}件の動画を復元しました`)
    }
  }, [])

  const openPdf = useCallback(async (file: File) => {
    setLoadingPdf(true)
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      await openPdfBytes(buf, file.name)
    } catch (e) {
      console.error("[v0] open pdf error", e)
      toast.error("PDFの読み込みに失敗しました")
    } finally {
      setLoadingPdf(false)
    }
  }, [openPdfBytes])

  const openDemoPdf = useCallback(async () => {
    setLoadingPdf(true)
    try {
      const buf = await createDemoPdfBytes()
      await openPdfBytes(buf, "pdf-video-demo.pdf")
      toast.success("サンプルPDFを開きました")
    } catch (e) {
      console.error("[v0] open demo pdf error", e)
      toast.error("サンプルPDFの生成に失敗しました")
    } finally {
      setLoadingPdf(false)
    }
  }, [openPdfBytes])

  // track most visible page
  useEffect(() => {
    if (!pdf) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) {
          const idx = Number((visible.target as HTMLElement).dataset.page)
          if (!Number.isNaN(idx)) setCurrentPage(idx)
        }
      },
      { threshold: [0.25, 0.5, 0.75] },
    )
    pageRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [pdf, dims.length])

  function addVideo(source: VideoSource) {
    const aspect = 16 / 9
    const dim = dims[currentPage]
    const w = 0.4
    // keep 16:9 within page using page aspect
    const h = dim ? (w * dim.width) / aspect / dim.height : 0.25
    const overlay: VideoOverlay = {
      id: crypto.randomUUID(),
      page: currentPage,
      x: (1 - w) / 2,
      y: Math.max(0, (1 - h) / 2),
      w,
      h,
      source,
      settings: { ...defaultSettings },
    }
    setOverlays((prev) => [...prev, overlay])
    setSelectedId(overlay.id)
    setMode("edit")
    toast.success("動画を追加しました")
  }

  function updateGeo(id: string, geo: Partial<Pick<VideoOverlay, "x" | "y" | "w" | "h">>) {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...geo } : o)))
  }

  function updateSettings(id: string, settings: Partial<VideoSettings>) {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, settings: { ...o.settings, ...settings } } : o)))
  }

  function deleteOverlay(id: string) {
    setOverlays((prev) => prev.filter((o) => o.id !== id))
    setSelectedId((cur) => (cur === id ? null : cur))
  }

  function centerOverlay(id: string) {
    setOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, x: (1 - o.w) / 2, y: (1 - o.h) / 2 } : o)),
    )
  }

  async function capturePoster(ov: VideoOverlay): Promise<string> {
    if (ov.source.type !== "file" || !ov.source.dataUrl) {
      return makePlaceholderPoster(ov.source.name)
    }
    return new Promise<string>((resolve) => {
      const video = document.createElement("video")
      video.muted = true
      video.crossOrigin = "anonymous"
      video.src = ov.source.dataUrl as string
      const fallback = () => resolve(makePlaceholderPoster(ov.source.name))
      video.addEventListener("loadeddata", () => {
        try {
          video.currentTime = Math.min(0.1, video.duration || 0.1)
        } catch {
          fallback()
        }
      })
      video.addEventListener("seeked", () => {
        try {
          const c = document.createElement("canvas")
          c.width = video.videoWidth || 640
          c.height = video.videoHeight || 360
          c.getContext("2d")!.drawImage(video, 0, 0, c.width, c.height)
          resolve(c.toDataURL("image/png"))
        } catch {
          fallback()
        }
      })
      video.addEventListener("error", fallback)
      setTimeout(fallback, 4000)
    })
  }

  async function handleExport() {
    if (!pdfBytes) return
    setExporting(true)
    try {
      const posters: Record<string, string> = {}
      for (const ov of overlays) {
        posters[ov.id] = await capturePoster(ov)
      }
      const out = await exportPdfWithVideos(pdfBytes, overlays, posters)
      const blob = new Blob([out as unknown as BlobPart], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = pdfName.replace(/\.pdf$/i, "") + "-video.pdf"
      a.click()
      URL.revokeObjectURL(url)
      toast.success("PDFをエクスポートしました")
    } catch (e) {
      console.error("[v0] export error", e)
      toast.error("エクスポートに失敗しました")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-muted/40">
      <Toaster position="top-center" />
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b bg-background px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Film className="size-4" />
          </div>
          <span className="text-sm font-semibold">PDF Video Studio</span>
        </div>

        {pdf && (
          <>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <span className="max-w-48 truncate text-sm text-muted-foreground">{pdfName}</span>

            <Separator orientation="vertical" className="mx-1 h-6" />
            <div className="flex items-center rounded-md border p-0.5">
              <ModeButton active={mode === "edit"} onClick={() => setMode("edit")} icon={<Pencil className="size-4" />} label="編集" />
              <ModeButton active={mode === "view"} onClick={() => { setMode("view"); setSelectedId(null) }} icon={<Eye className="size-4" />} label="ビューワー" />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-md border px-1">
                <Button variant="ghost" size="icon" className="size-7" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.2).toFixed(2)))}>
                  <ZoomOut className="size-4" />
                </Button>
                <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(2)))}>
                  <ZoomIn className="size-4" />
                </Button>
              </div>

              {mode === "edit" && (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="size-4" />
                  動画を追加
                </Button>
              )}

              <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
                {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                エクスポート
              </Button>

              <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="size-4" />
                開く
              </Button>
            </div>
          </>
        )}
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) openPdf(f)
          e.target.value = ""
        }}
      />

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1">
          {!pdf ? (
            <EmptyState
              onOpen={() => fileInputRef.current?.click()}
              onOpenDemo={openDemoPdf}
              loading={loadingPdf}
            />
          ) : (
            <ScrollArea className="h-full">
              <div className="flex flex-col items-center gap-8 px-6 py-8">
                {dims.map((dim, i) => (
                  <div key={i} data-page={i} ref={(el) => { pageRefs.current[i] = el }}>
                    <PdfPageView
                      pdf={pdf}
                      pageIndex={i}
                      dim={dim}
                      zoom={zoom}
                      overlays={overlays.filter((o) => o.page === i)}
                      mode={mode}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      onChangeGeo={updateGeo}
                      onDelete={deleteOverlay}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </main>

        {/* Right panel (edit mode) */}
        {pdf && mode === "edit" && (
          <aside className="w-72 shrink-0 border-l bg-background">
            <ScrollArea className="h-full">
              {selected ? (
                <PropertiesPanel
                  overlay={selected}
                  onChangeGeo={(geo) => updateGeo(selected.id, geo)}
                  onChangeSettings={(s) => updateSettings(selected.id, s)}
                  onCenter={() => centerOverlay(selected.id)}
                  onDelete={() => deleteOverlay(selected.id)}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-muted-foreground">
                  <Film className="size-8 opacity-40" />
                  <p>動画を選択すると、位置・サイズ・再生設定を編集できます。</p>
                  <p className="text-xs">「動画を追加」から始めましょう。</p>
                </div>
              )}
            </ScrollArea>
          </aside>
        )}
      </div>

      <AddVideoDialog open={addOpen} onOpenChange={setAddOpen} onAdd={addVideo} />
    </div>
  )
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded px-2.5 py-1 text-sm transition",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function EmptyState({
  onOpen,
  onOpenDemo,
  loading,
}: {
  onOpen: () => void
  onOpenDemo: () => void
  loading: boolean
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Film className="size-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-balance text-2xl font-semibold tracking-tight">PDFに動画を埋め込む</h1>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            PDFを開いて、動画ファイルやYouTube・URLの動画を好きな位置・サイズで配置。サイト内ですぐに再生でき、動画データを埋め込んだPDFとして書き出せます。
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="lg" onClick={onOpen} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
            PDFを開く
          </Button>
          <Button size="lg" variant="outline" onClick={onOpenDemo} disabled={loading}>
            サンプルを開く
          </Button>
        </div>
      </div>
    </div>
  )
}
