import type { VideoSourceType } from "./types"

export function detectSourceType(url: string): VideoSourceType {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube"
  return "url"
}

export function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export function youTubeEmbedUrl(
  url: string,
  opts: { autoplay: boolean; loop: boolean; muted: boolean; controls: boolean },
): string {
  const id = getYouTubeId(url)
  if (!id) return url
  const params = new URLSearchParams()
  params.set("autoplay", opts.autoplay ? "1" : "0")
  params.set("mute", opts.muted ? "1" : "0")
  params.set("controls", opts.controls ? "1" : "0")
  if (opts.loop) {
    params.set("loop", "1")
    params.set("playlist", id)
  }
  params.set("rel", "0")
  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
