"use client";

// Contact-form inquiries inbox.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./shared";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Trash2, Check, Loader2 } from "lucide-react";

type Message = { id: string; name: string; email?: string | null; phone?: string | null; message: string; handled: boolean; createdAt: string };

export default function InquiriesAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<{ messages: Message[] }>({
    queryKey: ["admin-messages"],
    queryFn: () => apiGet("/api/admin/messages"),
    refetchInterval: 60_000,
  });

  const toggle = useMutation({
    mutationFn: ({ id, handled }: { id: string; handled: boolean }) => apiPatch(`/api/admin/messages/${id}`, { handled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-messages"] }),
    onError: (e: Error) => toast({ title: "Could not update", description: e.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/messages/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-messages"] }),
    onError: (e: Error) => toast({ title: "Could not delete", description: e.message, variant: "destructive" }),
  });

  const [pendingDelete, setPendingDelete] = useState<Message | null>(null);

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-champagne" /></div>;

  const messages = data?.messages || [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Messages submitted through the website contact form.</p>
      {messages.length === 0 && <p className="rounded-[3px] border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">No inquiries yet.</p>}
      {messages.map((m) => (
        <div key={m.id} className={`rounded-[3px] border bg-card p-5 ${m.handled ? "border-border opacity-60" : "border-champagne/60"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{m.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[m.email, m.phone].filter(Boolean).join(" · ") || "No contact details"} · {new Date(m.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {m.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-[3px] gap-1.5 text-whatsapp hover:text-whatsapp"
                  onClick={() => window.open(`https://wa.me/${m.phone!.replace(/[^\d]/g, "")}`, "_blank", "noopener,noreferrer")}
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Reply
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="rounded-[3px] gap-1.5"
                onClick={() => toggle.mutate({ id: m.id, handled: !m.handled })}
              >
                <Check className="h-3.5 w-3.5" /> {m.handled ? "Reopen" : "Mark handled"}
              </Button>
              <Button size="sm" variant="outline" className="rounded-[3px] text-destructive hover:text-destructive" onClick={() => setPendingDelete(m)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <p className="mt-3 text-sm whitespace-pre-line text-foreground/80">{m.message}</p>
        </div>
      ))}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete message?"
        description={pendingDelete ? `The inquiry from "${pendingDelete.name}" will be permanently deleted.` : ""}
        pending={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      />
    </div>
  );
}
