"use client"

import { Trash2, AlignCenter, Film, Link2, Youtube } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { VideoOverlay, VideoSettings } from "@/lib/types"

interface Props {
  overlay: VideoOverlay
  onChangeGeo: (geo: Partial<Pick<VideoOverlay, "x" | "y" | "w" | "h">>) => void
  onChangeSettings: (settings: Partial<VideoSettings>) => void
  onCenter: () => void
  onDelete: () => void
}

export function PropertiesPanel({ overlay, onChangeGeo, onChangeSettings, onCenter, onDelete }: Props) {
  const { settings } = overlay
  const pct = (n: number) => Math.round(n * 100)

  const SourceIcon = overlay.source.type === "youtube" ? Youtube : overlay.source.type === "url" ? Link2 : Film

  return (
    <div className="flex flex-col gap-5 p-4">
      <div>
        <div className="mb-1 flex items-center gap-2 text-sm font-medium">
          <SourceIcon className="size-4 text-primary" />
          <span className="truncate">{overlay.source.name}</span>
        </div>
        <p className="text-xs text-muted-foreground">ページ {overlay.page + 1} に配置</p>
      </div>

      <Separator />

      {/* Position & size */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">位置とサイズ</h3>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="X (%)" value={pct(overlay.x)} onChange={(v) => onChangeGeo({ x: clamp01(v / 100) })} />
          <NumField label="Y (%)" value={pct(overlay.y)} onChange={(v) => onChangeGeo({ y: clamp01(v / 100) })} />
          <NumField label="幅 (%)" value={pct(overlay.w)} onChange={(v) => onChangeGeo({ w: clamp01(v / 100) })} />
          <NumField label="高さ (%)" value={pct(overlay.h)} onChange={(v) => onChangeGeo({ h: clamp01(v / 100) })} />
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={onCenter}>
          <AlignCenter className="size-4" />
          中央に配置
        </Button>
      </div>

      <Separator />

      {/* Playback settings */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">再生設定</h3>
        <ToggleRow label="自動再生" hint="ビューワーで開いた時に再生" checked={settings.autoplay} onChange={(v) => onChangeSettings({ autoplay: v })} />
        <ToggleRow label="ループ" checked={settings.loop} onChange={(v) => onChangeSettings({ loop: v })} />
        <ToggleRow label="ミュート" hint="自動再生には必須" checked={settings.muted} onChange={(v) => onChangeSettings({ muted: v })} />
        <ToggleRow label="コントロール表示" checked={settings.controls} onChange={(v) => onChangeSettings({ controls: v })} />
      </div>

      <Separator />

      {/* Appearance */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">外観</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <Label>不透明度</Label>
            <span className="text-muted-foreground">{settings.opacity}%</span>
          </div>
          <Slider value={[settings.opacity]} min={10} max={100} step={1} onValueChange={([v]) => onChangeSettings({ opacity: v })} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <Label>角丸</Label>
            <span className="text-muted-foreground">{settings.radius}px</span>
          </div>
          <Slider value={[settings.radius]} min={0} max={40} step={1} onValueChange={([v]) => onChangeSettings({ radius: v })} />
        </div>
      </div>

      <Separator />

      <Button variant="destructive" size="sm" onClick={onDelete}>
        <Trash2 className="size-4" />
        動画を削除
      </Button>
    </div>
  )
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-8"
      />
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <Label className="text-sm">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function clamp01(v: number) {
  return Math.min(Math.max(v, 0), 1)
}
