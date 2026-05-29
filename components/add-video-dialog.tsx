"use client"

import { useRef, useState } from "react"
import { Upload, Link2, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { VideoSource } from "@/lib/types"
import { detectSourceType, fileToDataUrl } from "@/lib/video"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (source: VideoSource) => void
}

export function AddVideoDialog({ open, onOpenChange, onAdd }: Props) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setLoading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      onAdd({ type: "file", src: dataUrl, dataUrl, name: file.name, mimeType: file.type })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  function handleUrl() {
    const v = url.trim()
    if (!v) return
    const type = detectSourceType(v)
    const name = type === "youtube" ? "YouTube動画" : v.split("/").pop() || "動画URL"
    onAdd({ type, src: v, name })
    setUrl("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>動画を追加</DialogTitle>
          <DialogDescription>ファイルをアップロードするか、動画のURLを貼り付けます。</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="file">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">
              <Upload className="size-4" />
              ファイル
            </TabsTrigger>
            <TabsTrigger value="url">
              <Link2 className="size-4" />
              URL / YouTube
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="pt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
                e.target.value = ""
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-10 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
            >
              {loading ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <Upload className="size-6" />
              )}
              <span>クリックして動画ファイルを選択</span>
              <span className="text-xs">MP4 / WebM / MOV など</span>
            </button>
          </TabsContent>

          <TabsContent value="url" className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label htmlFor="video-url">動画URL</Label>
              <Input
                id="video-url"
                placeholder="https://... または YouTube リンク"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUrl()}
              />
            </div>
            <Button className="w-full" onClick={handleUrl} disabled={!url.trim()}>
              追加
            </Button>
            <p className="text-xs text-muted-foreground">
              直リンクのmp4はサイト内で再生されます。YouTubeは埋め込みプレーヤーで表示されます。
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
