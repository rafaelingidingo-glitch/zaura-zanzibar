"use client";

// Shared admin building blocks.

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, Link2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiPost } from "@/lib/admin-client";
import { BOOKING_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Reusable destructive-action confirmation. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  pending,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[3px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-[3px]">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="rounded-[3px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={pending}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const meta = BOOKING_STATUS_META[status] || { label: status, color: "#555", bg: "#eee", border: "#ddd" };
  return (
    <span
      className="inline-flex items-center rounded-[3px] px-2.5 py-1 text-[11px] font-medium tracking-wide border"
      style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}
    >
      {meta.label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("rounded-[3px] border bg-card p-5", accent ? "border-champagne shadow-[0_6px_24px_rgba(197,164,119,0.15)]" : "border-border")}>
      <p className="eyebrow text-muted-foreground text-[0.6rem]">{label}</p>
      <p className="mt-2 font-display text-[1.7rem] leading-none">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Image list manager with secure upload (stored in Postgres, served via /api/images/[id]). */
export function ImageManager({
  images,
  onChange,
  label = "Images",
}: {
  images: { url: string; alt?: string }[];
  onChange: (imgs: { url: string; alt: string }[]) => void;
  label?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiPost<{ url: string }>("/api/admin/upload", fd);
      onChange([...images, { url: res.url, alt: "" }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <p className="eyebrow text-muted-foreground text-[0.6rem] mb-2">{label}</p>
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-3">
          {images.map((img, i) => (
            <div key={i} className="relative group rounded-[3px] overflow-hidden border border-border">
              <div className="relative aspect-[4/3]">
                <Image src={img.url} alt={img.alt || "image"} fill sizes="140px" className="object-cover" unoptimized={img.url.startsWith("/api/")} />
              </div>
              <input
                className="w-full border-t border-border px-2 py-1.5 text-[11px] bg-card outline-none"
                placeholder="Alt text"
                value={img.alt}
                onChange={(e) => {
                  const next = [...images];
                  next[i] = { ...next[i], alt: e.target.value };
                  onChange(next as { url: string; alt: string }[]);
                }}
              />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, idx) => idx !== i) as { url: string; alt: string }[])}
                className="absolute top-1.5 right-1.5 rounded-full bg-charcoal/80 p-1 text-ivory opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-[3px] gap-1.5"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload
        </Button>
        <div className="flex gap-1.5 flex-1 min-w-[200px]">
          <Input
            className="h-8 text-xs rounded-[3px]"
            placeholder="…or paste an image URL"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-[3px] gap-1"
            onClick={() => {
              if (!urlValue.trim()) return;
              onChange([...images, { url: urlValue.trim(), alt: "" }]);
              setUrlValue("");
            }}
          >
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export const money = (amount: number, currency: string) =>
  `${currency} ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
