"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DateField, GuestSelect } from "./fields";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBookingFlow } from "@/store/booking";
import { localFromKey, todayInPropertyTz } from "@/lib/dates";
import type { CategoryDTO } from "@/types/site";

export default function BookingBar({ categories }: { categories: CategoryDTO[] }) {
  const openWizard = useBookingFlow((s) => s.openWizard);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [categoryId, setCategoryId] = useState("any");
  const [error, setError] = useState("");

  const todayKey = todayInPropertyTz().toISOString().slice(0, 10);

  const submit = () => {
    setError("");
    if (!checkIn) return setError("Please select a check-in date.");
    if (!checkOut) return setError("Please select a check-out date.");
    if (checkOut <= checkIn) return setError("Check-out must be after check-in.");
    openWizard({
      checkIn,
      checkOut,
      adults,
      children,
      categoryId: categoryId === "any" ? null : categoryId,
    });
  };

  return (
    <div className="relative z-20 -mt-20 px-4 md:px-8" aria-label="Booking search">
      <div className="mx-auto max-w-6xl rounded-[4px] bg-card/98 shadow-[0_18px_50px_rgba(36,37,34,0.14)] border border-border/70 backdrop-blur-sm">
        <div className="p-5 md:p-7">
          <p className="eyebrow text-champagne mb-4">Plan your stay</p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 items-end">
            <DateField
              label="Check-in"
              value={checkIn}
              placeholder="Add date"
              onChange={(v) => {
                setCheckIn(v);
                if (checkOut && v >= checkOut) setCheckOut("");
              }}
              disabledBefore={localFromKey(todayKey)}
            />
            <DateField
              label="Check-out"
              value={checkOut}
              placeholder="Add date"
              onChange={setCheckOut}
              disabledBefore={checkIn ? new Date(localFromKey(checkIn).getTime() + 86400000) : new Date(localFromKey(todayKey).getTime() + 86400000)}
            />
            <GuestSelect label="Adults" value={adults} onChange={setAdults} max={10} min={1} />
            <GuestSelect label="Children" value={children} onChange={setChildren} max={7} />
            <div className="flex flex-col gap-1.5">
              <span className="eyebrow text-muted-foreground text-[0.6rem]">Accommodation</span>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="zaura-input h-11 w-full rounded-[3px] font-normal">
                  <SelectValue placeholder="Any type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any apartment type</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={submit}
              className="h-11 eyebrow bg-charcoal text-ivory rounded-[3px] hover:bg-champagne hover:text-charcoal transition-colors col-span-2 md:col-span-1"
            >
              Check availability
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
}
