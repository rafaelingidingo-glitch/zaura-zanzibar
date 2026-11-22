"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/admin-client";
import { useToast } from "@/hooks/use-toast";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const login = useMutation({
    mutationFn: () => apiPost("/api/admin/auth/login", { email, password }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-me"] });
      onSuccess();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display text-3xl text-ivory">ZAURA ZANZIBAR</p>
          <p className="eyebrow text-champagne mt-2">Management Dashboard</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            setLoading(true);
            login.mutate(undefined, { onSettled: () => setLoading(false) });
          }}
          className="rounded-[3px] bg-ivory p-7 shadow-2xl"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-email" className="text-xs">Email</Label>
              <Input
                id="admin-email"
                type="email"
                required
                className="zaura-input rounded-[3px] h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@zaurazanzibar.com"
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-password" className="text-xs">Password</Label>
              <Input
                id="admin-password"
                type="password"
                required
                className="zaura-input rounded-[3px] h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 eyebrow bg-charcoal text-ivory rounded-[3px] hover:bg-champagne hover:text-charcoal"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>
        <p className="mt-5 text-center text-xs text-ivory/50">
          Authorized staff only · All activity is logged
        </p>
      </div>
    </div>
  );
}
