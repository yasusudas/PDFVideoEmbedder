"use client"

import { forwardRef } from "react"
import type { VideoOverlay } from "@/lib/types"
import { youTubeEmbedUrl } from "@/lib/video"

interface Props {
  overlay: VideoOverlay
  /** when false, the media is shown but not interactive (edit mode) */
  interactive: boolean
}

/** Renders the actual playable media (HTML video, raw URL video, or YouTube iframe). */
export const VideoContent = forwardRef<HTMLVideoElement, Props>(function VideoContent(
  { overlay, interactive },
  ref,
) {
  const { source, settings } = overlay
  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: settings.radius,
    opacity: settings.opacity / 100,
    pointerEvents: interactive ? "auto" : "none",
    backgroundColor: "#000",
  }

  if (source.type === "youtube") {
    const src = interactive
      ? youTubeEmbedUrl(source.src, settings)
      : youTubeEmbedUrl(source.src, { ...settings, autoplay: false })
    return (
      <iframe
        src={src}
        title={source.name}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={style}
        // iframe is non-interactive in edit mode via parent overlay
      />
    )
  }

  const playbackSrc = source.dataUrl || source.src
  return (
    <video
      ref={ref}
      src={playbackSrc}
      style={style}
      controls={interactive && settings.controls}
      autoPlay={interactive && settings.autoplay}
      loop={settings.loop}
      muted={settings.muted}
      playsInline
      crossOrigin="anonymous"
      preload="metadata"
    />
  )
})
