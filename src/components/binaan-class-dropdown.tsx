"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface BinaanClassDropdownProps {
  selectedKelas: string
  onSelectKelas: (kelas: string) => void
}

export function BinaanClassDropdown({
  selectedKelas,
  onSelectKelas,
}: BinaanClassDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 text-xs sm:text-sm font-medium gap-1.5 cursor-pointer bg-background border-border"
          >
            <span>Kelas ({selectedKelas.toUpperCase()})</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent className="w-40" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-bold text-foreground">
            Pilih Kelas
          </DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={selectedKelas === "9b"}
            onCheckedChange={() => onSelectKelas("9b")}
            className="cursor-pointer text-xs"
          >
            Kelas 9B
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={selectedKelas === "8h"}
            onCheckedChange={() => onSelectKelas("8h")}
            className="cursor-pointer text-xs"
          >
            Kelas 8H
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={selectedKelas === "8i"}
            onCheckedChange={() => onSelectKelas("8i")}
            className="cursor-pointer text-xs"
          >
            Kelas 8I
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
