"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCcw, Check, X, Move } from "lucide-react"

export interface AvatarCropperDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageSrc: string | null
  onApply: (croppedDataUrl: string) => void
}

const VIEWPORT_SIZE = 280
const CIRCLE_RADIUS = 110
const CIRCLE_DIAMETER = CIRCLE_RADIUS * 2
const CIRCLE_TOP_LEFT = (VIEWPORT_SIZE - CIRCLE_DIAMETER) / 2 // 30px

export function AvatarCropperDialog({
  open,
  onOpenChange,
  imageSrc,
  onApply,
}: AvatarCropperDialogProps) {
  const [zoom, setZoom] = useState<number>(1.0)
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const dragStartRef = useRef<{ clientX: number; clientY: number; offsetX: number; offsetY: number }>({
    clientX: 0,
    clientY: 0,
    offsetX: 0,
    offsetY: 0,
  })
  const imageRef = useRef<HTMLImageElement | null>(null)

  // Reset offset and zoom when dialog opens with new image
  useEffect(() => {
    if (open) {
      setZoom(1.0)
      setOffset({ x: 0, y: 0 })
    }
  }, [open, imageSrc])

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setNaturalSize({
      width: img.naturalWidth || 400,
      height: img.naturalHeight || 400,
    })
  }

  // Calculate base scale so image at 1.0x zoom at least covers the circle
  const baseScale = React.useMemo(() => {
    if (!naturalSize.width || !naturalSize.height) return 1
    return Math.max(
      CIRCLE_DIAMETER / naturalSize.width,
      CIRCLE_DIAMETER / naturalSize.height
    )
  }, [naturalSize])

  const displayWidth = naturalSize.width ? naturalSize.width * baseScale * zoom : VIEWPORT_SIZE
  const displayHeight = naturalSize.height ? naturalSize.height * baseScale * zoom : VIEWPORT_SIZE

  // Pointer drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.clientX
    const dy = e.clientY - dragStartRef.current.clientY
    setOffset({
      x: dragStartRef.current.offsetX + dx,
      y: dragStartRef.current.offsetY + dy,
    })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // Safe ignore
      }
      setIsDragging(false)
    }
  }

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom((prev) => Math.min(3.0, Math.max(1.0, Number((prev + delta).toFixed(2)))))
  }

  const handleReset = () => {
    setZoom(1.0)
    setOffset({ x: 0, y: 0 })
  }

  const handleApply = useCallback(() => {
    if (!imageRef.current || !naturalSize.width || !naturalSize.height) {
      onOpenChange(false)
      return
    }

    const canvas = document.createElement("canvas")
    const OUTPUT_SIZE = 400
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      onOpenChange(false)
      return
    }

    // Coordinates of circle relative to image top-left
    const imgLeft = VIEWPORT_SIZE / 2 + offset.x - displayWidth / 2
    const imgTop = VIEWPORT_SIZE / 2 + offset.y - displayHeight / 2

    const relX = CIRCLE_TOP_LEFT - imgLeft
    const relY = CIRCLE_TOP_LEFT - imgTop

    const scaleFactor = naturalSize.width / displayWidth

    const sx = relX * scaleFactor
    const sy = relY * scaleFactor
    const sWidth = CIRCLE_DIAMETER * scaleFactor
    const sHeight = CIRCLE_DIAMETER * scaleFactor

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(
      imageRef.current,
      sx,
      sy,
      sWidth,
      sHeight,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    )

    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.92)
    onApply(croppedDataUrl)
    onOpenChange(false)
  }, [displayWidth, displayHeight, naturalSize, offset, onApply, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-border shadow-2xl">
        <div className="p-5 border-b border-border/60">
          <DialogHeader className="p-0 text-left">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Move className="h-4 w-4 text-[#4274D9]" />
              <span>Sesuaikan &amp; Posisikan Foto Profil</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Geser foto dan atur zoom agar pas di dalam lingkaran avatar.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-5 flex flex-col items-center gap-4 bg-muted/20">
          {/* Interactive Viewport */}
          <div
            className="relative w-[280px] h-[280px] rounded-2xl overflow-hidden bg-neutral-950 border border-border shadow-inner cursor-grab active:cursor-grabbing select-none touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            {imageSrc ? (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={handleImageLoad}
                draggable={false}
                style={{
                  width: `${displayWidth}px`,
                  height: `${displayHeight}px`,
                  position: "absolute",
                  left: `${VIEWPORT_SIZE / 2 + offset.x - displayWidth / 2}px`,
                  top: `${VIEWPORT_SIZE / 2 + offset.y - displayHeight / 2}px`,
                  maxWidth: "none",
                  maxHeight: "none",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                Tidak ada gambar
              </div>
            )}

            {/* Circular Mask Overlay */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none select-none z-10"
              viewBox="0 0 280 280"
            >
              <defs>
                <mask id="avatar-crop-mask">
                  <rect width="280" height="280" fill="white" />
                  <circle cx="140" cy="140" r="110" fill="black" />
                </mask>
              </defs>
              <rect
                width="280"
                height="280"
                fill="rgba(0, 0, 0, 0.6)"
                mask="url(#avatar-crop-mask)"
              />
              <circle
                cx="140"
                cy="140"
                r="110"
                fill="none"
                stroke="#4274D9"
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.9"
              />
            </svg>

            {/* Drag hint badge */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] text-white/90 flex items-center gap-1 font-medium shadow-xs">
              <Move className="h-3 w-3" />
              <span>Geser untuk memposisikan</span>
            </div>
          </div>

          {/* Zoom and Reset Controls */}
          <div className="w-full max-w-[280px] space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1">
                <ZoomIn className="h-3.5 w-3.5" />
                <span>Pembesaran (Zoom)</span>
              </span>
              <span className="font-mono text-[11px] text-foreground font-semibold">
                {zoom.toFixed(1)}x
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setZoom((z) => Math.max(1.0, Number((z - 0.1).toFixed(2))))}
                disabled={zoom <= 1.0}
                className="h-7 w-7 rounded-md shrink-0 border-border"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>

              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-[#4274D9]"
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.1).toFixed(2))))}
                disabled={zoom >= 3.0}
                className="h-7 w-7 rounded-md shrink-0 border-border"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                title="Pusatkan posisi & zoom"
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 border border-border/50"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Pusatkan</span>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-card border-t border-border/60 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs cursor-pointer gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            <span>Batal</span>
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="h-8 text-xs bg-[#4274D9] hover:bg-[#3561bd] text-white font-medium cursor-pointer gap-1.5 shadow-xs"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Terapkan Foto</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
