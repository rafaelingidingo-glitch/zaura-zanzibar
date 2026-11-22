"use client";

import { create } from "zustand";
import type { BookingResult } from "@/types/site";

export type BookingPreset = {
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  categoryId?: string | null;
};

type BookingFlowState = {
  open: boolean;
  step: number; // 1 dates, 2 category & unit, 3 guest details, 4 summary, 5 success
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  categoryId: string | null;
  unitId: string | null;
  contactChoice: "PRIMARY" | "SECONDARY";
  result: BookingResult | null;
  whatsappLinks: { primary?: string; secondary?: string };
  openWizard: (preset?: BookingPreset) => void;
  closeWizard: () => void;
  setStep: (step: number) => void;
  setDates: (checkIn: string, checkOut: string) => void;
  setGuests: (adults: number, children: number) => void;
  setCategory: (id: string | null) => void;
  setUnit: (id: string | null) => void;
  setContactChoice: (c: "PRIMARY" | "SECONDARY") => void;
  setResult: (r: BookingResult | null, links?: { primary?: string; secondary?: string }) => void;
};

export const useBookingFlow = create<BookingFlowState>((set) => ({
  open: false,
  step: 1,
  checkIn: "",
  checkOut: "",
  adults: 2,
  children: 0,
  categoryId: null,
  unitId: null,
  contactChoice: "PRIMARY",
  result: null,
  whatsappLinks: {},
  openWizard: (preset) =>
    set((s) => {
      const checkIn = preset?.checkIn ?? s.checkIn;
      const checkOut = preset?.checkOut ?? s.checkOut;
      const hasDates = Boolean(checkIn && checkOut);
      return {
        open: true,
        // Step 2 (category/unit) is only meaningful once valid dates exist.
        step: hasDates ? 2 : 1,
        result: null,
        whatsappLinks: {},
        unitId: null,
        checkIn,
        checkOut,
        adults: preset?.adults ?? s.adults,
        children: preset?.children ?? s.children,
        categoryId: preset?.categoryId !== undefined ? preset.categoryId : s.categoryId,
        contactChoice: s.contactChoice,
      };
    }),
  closeWizard: () => set({ open: false, step: 1, result: null }),
  setStep: (step) => set({ step }),
  // Changing dates or party size invalidates any previously chosen apartment.
  setDates: (checkIn, checkOut) => set({ checkIn, checkOut, unitId: null }),
  setGuests: (adults, children) => set({ adults, children, unitId: null }),
  setCategory: (categoryId) => set({ categoryId, unitId: null }),
  setUnit: (unitId) => set({ unitId }),
  setContactChoice: (contactChoice) => set({ contactChoice }),
  setResult: (result, links = {}) => set({ result, whatsappLinks: links }),
}));
