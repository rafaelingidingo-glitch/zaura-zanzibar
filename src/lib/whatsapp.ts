// WhatsApp Click-to-Chat link + booking message builder.

import { formatLongDate } from "./dates";

export function normalizePhone(raw: string): string {
  let digits = raw.replace(/[^\d]/g, "");
  // Local formatting starting with a single 0 → international (Tanzania 255)
  if (digits.startsWith("0") && digits.length >= 10) digits = `255${digits.slice(1)}`;
  return digits;
}

export function waLink(phoneRaw: string, message: string): string {
  const phone = normalizePhone(phoneRaw);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export type BookingMessageInput = {
  reference: string;
  guestName: string;
  categoryName: string;
  unitNumber?: string | null;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  nights: number;
  estTotal: number;
  currency: string;
};

export function buildBookingMessage(b: BookingMessageInput): string {
  const money =
    b.estTotal > 0 ? `${b.currency} ${b.estTotal.toLocaleString("en-US")}` : "To be confirmed";
  const unitLine = b.unitNumber ? `Apartment Number: ${b.unitNumber}\n` : "";
  const guests =
    b.children > 0 ? `${b.adults} adults + ${b.children} children` : `${b.adults} adults`;

  return [
    "Hello Zaura Zanzibar Team,",
    "",
    "I would like to request an apartment reservation.",
    "",
    `Booking Reference: ${b.reference}`,
    `Guest Name: ${b.guestName}`,
    `Apartment Type: ${b.categoryName}`,
    unitLine,
    `Check-in: ${formatLongDate(b.checkIn)}`,
    `Check-out: ${formatLongDate(b.checkOut)}`,
    `Nights: ${b.nights}`,
    `Guests: ${guests}`,
    `Estimated Total: ${money}`,
    "",
    "Please confirm availability and reservation details.",
    "",
    "Thank you.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
