"use client"

import * as React from "react"
import { OTPInput, OTPInputContext, REGEXP_ONLY_DIGITS } from "input-otp"
import { Minus } from "lucide-react"

import { cn } from "@/lib/utils"

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center gap-2 has-disabled:opacity-50",
        containerClassName
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center", className)}
      {...props}
    />
  )
}

function InputOTPSlot({
  index,
  className,
  mask,
  ...props
}: React.ComponentProps<"div"> & {
  index: number
  mask?: string
}) {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index] || {}

  const displayChar = char ? (mask !== undefined ? mask : char) : null

  return (
    <div
      data-slot="input-otp-slot"
      className={cn(
        "border-input data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40 data-[active=true]:aria-invalid:border-destructive relative flex h-11 w-11 items-center justify-center border-y border-r text-base font-semibold shadow-xs transition-all outline-none first:rounded-l-xl first:border-l last:rounded-r-xl data-[active=true]:z-10 data-[active=true]:ring-[3px]",
        className
      )}
      data-active={isActive}
      {...props}
    >
      {displayChar}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <Minus className="h-4 w-4 text-muted-foreground" />
    </div>
  )
}

export function InputOTPWithSeparator({
  value,
  onChange,
  onComplete,
  showPin = true,
  disabled = false,
}: {
  value?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  showPin?: boolean
  disabled?: boolean
}) {
  return (
    <InputOTP
      maxLength={6}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      pattern={REGEXP_ONLY_DIGITS}
      disabled={disabled}
    >
      <InputOTPGroup>
        <InputOTPSlot index={0} mask={showPin ? undefined : "•"} />
        <InputOTPSlot index={1} mask={showPin ? undefined : "•"} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={2} mask={showPin ? undefined : "•"} />
        <InputOTPSlot index={3} mask={showPin ? undefined : "•"} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={4} mask={showPin ? undefined : "•"} />
        <InputOTPSlot index={5} mask={showPin ? undefined : "•"} />
      </InputOTPGroup>
    </InputOTP>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator, REGEXP_ONLY_DIGITS }
