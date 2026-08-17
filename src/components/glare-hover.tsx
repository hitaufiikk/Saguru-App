"use client"

import React, { useRef } from "react"

interface GlareHoverProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  glareColor?: string
  glareOpacity?: number
  glareAngle?: number
  glareSize?: number
  transitionDuration?: number
  playOnce?: boolean
  className?: string
}

export default function GlareHover({
  children,
  glareColor = "#ffffff",
  glareOpacity = 0.7,
  glareAngle = 45,
  glareSize = 180,
  transitionDuration = 700,
  playOnce = false,
  className = "",
  style,
  ...props
}: GlareHoverProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const hex = glareColor.replace("#", "")
  let rgba = `rgba(255, 255, 255, ${glareOpacity})`
  if (/^[\dA-Fa-f]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    rgba = `rgba(${r}, ${g}, ${b}, ${glareOpacity})`
  } else if (/^[\dA-Fa-f]{3}$/.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16)
    const g = parseInt(hex[1] + hex[1], 16)
    const b = parseInt(hex[2] + hex[2], 16)
    rgba = `rgba(${r}, ${g}, ${b}, ${glareOpacity})`
  }

  const animateIn = () => {
    const el = overlayRef.current
    if (!el) return

    el.style.transition = "none"
    el.style.transform = "translate(-120%, -120%)"
    void el.offsetHeight // Trigger reflow so transition applies cleanly
    el.style.transition = `transform ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`
    el.style.transform = "translate(120%, 120%)"
  }

  const animateOut = () => {
    const el = overlayRef.current
    if (!el) return

    if (playOnce) {
      el.style.transition = "none"
      el.style.transform = "translate(-120%, -120%)"
    } else {
      el.style.transition = `transform ${transitionDuration}ms ease-out`
      el.style.transform = "translate(-120%, -120%)"
    }
  }

  return (
    <div
      className={`relative overflow-hidden cursor-pointer group transition-all duration-300 ${className}`}
      style={style}
      onMouseEnter={animateIn}
      onMouseLeave={animateOut}
      {...props}
    >
      {/* Glare Light Beam Overlay */}
      <div
        ref={overlayRef}
        className="absolute pointer-events-none z-30"
        style={{
          background: `linear-gradient(${glareAngle}deg, transparent 20%, ${rgba} 50%, transparent 80%)`,
          width: `${glareSize}%`,
          height: `${glareSize}%`,
          top: "-40%",
          left: "-40%",
          transform: "translate(-120%, -120%)",
          willChange: "transform",
        }}
      />
      {children}
    </div>
  )
}
