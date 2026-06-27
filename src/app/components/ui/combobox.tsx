import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "./utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  "aria-label"?: string;
  className?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  "aria-label": ariaLabel,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            "flex min-h-[38px] w-full items-center justify-between gap-2 rounded border bg-[var(--input-background,#EDE8DF)] px-3 py-1.5 text-[13px] text-foreground transition-colors",
            "border-[rgba(23,20,15,0.15)] hover:border-accent/40",
            "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown size={13} className="shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" style={{ zIndex: 1010 }}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="text-[13px]" />
          <CommandList>
            <CommandEmpty className="text-[12px] text-muted-foreground">{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value === value ? "" : option.value);
                    setOpen(false);
                  }}
                  className="text-[13px]"
                >
                  <Check
                    size={13}
                    className={cn("shrink-0", option.value === value ? "opacity-100" : "opacity-0")}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
