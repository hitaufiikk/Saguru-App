"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  name?: string
  className?: string
  children?: React.ReactNode
}

interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string
  id?: string
  className?: string
}

const RadioGroupContext = React.createContext<{
  value?: string
  onChange?: (val: string) => void
  name?: string
}>({})

export function RadioGroup({
  defaultValue,
  value: controlledValue,
  onValueChange,
  name,
  className,
  children,
  ...props
}: RadioGroupProps) {
  const [value, setValue] = React.useState(controlledValue ?? defaultValue ?? "")

  const handleChange = (val: string) => {
    if (controlledValue === undefined) {
      setValue(val)
    }
    onValueChange?.(val)
  }

  const currentValue = controlledValue !== undefined ? controlledValue : value

  return (
    <RadioGroupContext.Provider value={{ value: currentValue, onChange: handleChange, name }}>
      <div className={cn("grid gap-2", className)} {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

export function RadioGroupItem({
  value,
  id,
  className,
  ...props
}: RadioGroupItemProps) {
  const context = React.useContext(RadioGroupContext)
  const isChecked = context.value === value

  return (
    <div className="relative flex items-center justify-center">
      <input
        type="radio"
        id={id}
        name={context.name}
        value={value}
        checked={isChecked}
        onChange={() => context.onChange?.(value)}
        className={cn(
          "peer h-4 w-4 appearance-none rounded-full border border-input shadow-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition-colors",
          isChecked && "border-[#4274D9] bg-[#4274D9] dark:bg-[#60A5FA] dark:border-[#60A5FA]",
          className
        )}
        {...props}
      />
      {isChecked && (
        <span className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-white dark:bg-zinc-950" />
      )}
    </div>
  )
}
