'use client'

import { motion, type Variants } from "motion/react";
import { CheckCircle, LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LETTER_VARIANTS: Variants = {
  hidden: { y: -14, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      delay: i * 0.038,
      duration: 0.35,
      ease: [0.215, 0.61, 0.355, 1],
    },
  }),
};

const MotionBadge = motion.create(Badge);

interface MotionBadgeProps {
  label?: string;
  borderColor?: string;
  glowColor?: string;
  textColor?: string;
  icon?: LucideIcon;
}

export function AnimatedStatusBadge({
  label = "Success",
  borderColor = "border-teal-400/25",
  glowColor = "rgba(45,212,191,0.95)",
  textColor = "text-teal-400",
  icon: IconComponent = CheckCircle,
}: MotionBadgeProps) {
  return (
    <MotionBadge
      variant="outline"
      className={cn(
        "relative h-auto cursor-default overflow-visible rounded-full",
        "gap-1.5 px-2.5 py-1 text-xs font-medium leading-none",
        "bg-background/80 backdrop-blur-md",
        "text-foreground",
        borderColor,
      )}
    >
      {/* Top glow */}
      <motion.span
        aria-hidden
        animate={{ opacity: 0.55 }}
        transition={{ duration: 0.45 }}
        style={{
          background: `radial-gradient(ellipse 80% 100% at 50% 100%, ${glowColor} 0%, transparent 70%)`,
        }}
        className="pointer-events-none absolute -top-2 left-[10%] right-[10%] h-4 blur"
      />
      <motion.span
        aria-hidden
        animate={{ opacity: 0.75 }}
        transition={{ duration: 0.45 }}
        style={{
          background: `radial-gradient(ellipse 70% 100% at 50% 100%, ${glowColor} 0%, transparent 70%)`,
        }}
        className="pointer-events-none absolute -top-1 left-[22%] right-[22%] h-2 blur-sm"
      />
      <motion.span
        aria-hidden
        animate={{ opacity: 0.9 }}
        transition={{ duration: 0.45 }}
        style={{
          background: `radial-gradient(ellipse 40% 50% at 50% 50%, ${glowColor} 0%, transparent 100%)`,
        }}
        className="pointer-events-none absolute top-0 left-[28%] right-[28%] h-px"
      />

      {/* Icon */}
      <motion.span
        initial={{ scale: 0.35, opacity: 0, rotate: -25 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.32, ease: [0.175, 0.885, 0.32, 1.275] }}
        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center"
      >
        <IconComponent size={14} strokeWidth={2} className={textColor} />
      </motion.span>

      {/* Animated label */}
      <span className="inline-flex overflow-hidden leading-none font-semibold">
        {label.split("").map((char, i) => (
          <motion.span
            key={i}
            custom={i}
            variants={LETTER_VARIANTS}
            initial="hidden"
            animate="visible"
            className="inline-block whitespace-pre"
          >
            {char}
          </motion.span>
        ))}
      </span>
    </MotionBadge>
  );
}

export default AnimatedStatusBadge;
