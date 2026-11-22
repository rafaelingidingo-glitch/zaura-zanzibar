"use client";

// Shared elegant form fields for date/guest selection.

import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { dateKeyFromLocal, localFromKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function DateField({
  value,
  onChange,
  placeholder,
  disabledBefore,
  label,
  id,
}: {
  value: string;
  onChange: (key: string) => void;
  placeholder: string;
  disabledBefore?: Date;
  label: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="eyebrow text-muted-foreground text-[0.6rem]">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "zaura-input justify-between font-normal w-full h-11 rounded-[3px] border-input bg-card",
              !value && "text-muted-foreground"
            )}
          >
            {value
              ? localFromKey(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : placeholder}
            <CalendarIcon className="h-4 w-4 text-champagne" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0 z-[90]" sideOffset={6}>
          <Calendar
            mode="single"
            selected={value ? localFromKey(value) : undefined}
            onSelect={(d) => {
              if (d) {
                onChange(dateKeyFromLocal(d));
                setOpen(false);
              }
            }}
            disabled={(d) => {
              if (disabledBefore) {
                const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                const b = new Date(disabledBefore.getFullYear(), disabledBefore.getMonth(), disabledBefore.getDate()).getTime();
                if (a < b) return true;
              }
              return false;
            }}
            defaultMonth={value ? localFromKey(value) : undefined}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function GuestSelect({
  label,
  value,
  onChange,
  max,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max: number;
  min?: number;
}) {
  const items = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => i + min);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="eyebrow text-muted-foreground text-[0.6rem]">{label}</span>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="zaura-input h-11 w-full rounded-[3px] font-normal">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {items.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
