export type VideoSourceType = "file" | "url" | "youtube"

export interface VideoSource {
  type: VideoSourceType
  /** For file: object URL (session) or data URL (persisted). For url/youtube: the URL. */
  src: string
  /** Original file name or label */
  name: string
  /** Raw data URL for files, so overlays can be persisted/exported and restored */
  dataUrl?: string
  mimeType?: string
}

export interface VideoSettings {
  autoplay: boolean
  loop: boolean
  muted: boolean
  controls: boolean
  /** 0 - 100 */
  opacity: number
  /** corner radius in px */
  radius: number
}

export interface VideoOverlay {
  id: string
  /** 0-based page index */
  page: number
  /** position & size as fraction (0-1) of the page dimensions */
  x: number
  y: number
  w: number
  h: number
  source: VideoSource
  settings: VideoSettings
}

export interface PdfDocState {
  /** original pdf bytes for export */
  bytes: Uint8Array
  name: string
  numPages: number
}

export const defaultSettings: VideoSettings = {
  autoplay: false,
  loop: false,
  muted: true,
  controls: true,
  opacity: 100,
  radius: 8,
}

/** Schema for the JSON we attach to / read from the exported PDF */
export interface OverlayBundle {
  version: 1
  overlays: VideoOverlay[]
}
