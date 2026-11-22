"use client";

// Secure Zaura Zanzibar management dashboard (hash-routed at #admin).

import { useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/admin-client";
import Login from "./Login";
import Overview from "./Overview";
import Reservations from "./Reservations";
import CalendarView from "./CalendarView";
import ApartmentsAdmin from "./ApartmentsAdmin";
import AmenitiesAdmin from "./AmenitiesAdmin";
import GalleryAdmin from "./GalleryAdmin";
import ContentAdmin from "./ContentAdmin";
import GuestsAdmin from "./GuestsAdmin";
import InquiriesAdmin from "./InquiriesAdmin";
import ReportsAdmin from "./ReportsAdmin";
import SettingsAdmin from "./SettingsAdmin";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, CalendarCheck, CalendarDays, Building2, Sparkles, Images,
  FileText, Users, Inbox, BarChart3, Settings, LogOut, Globe, Bell, Menu, X, ExternalLink,
} from "lucide-react";

type Tab =
  | "overview" | "reservations" | "calendar" | "apartments" | "amenities"
  | "gallery" | "content" | "guests" | "inquiries" | "reports" | "settings";

const NAV: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "reservations", label: "Reservations", icon: CalendarCheck },
  { id: "calendar", label: "Availability calendar", icon: CalendarDays },
  { id: "apartments", label: "Apartments", icon: Building2 },
  { id: "amenities", label: "Amenities", icon: Sparkles },
  { id: "gallery", label: "Gallery", icon: Images },
  { id: "content", label: "Website content", icon: FileText },
  { id: "guests", label: "Guests", icon: Users },
  { id: "inquiries", label: "Inquiries", icon: Inbox },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const TAB_TITLES: Record<Tab, string> = {
  overview: "Dashboard Overview",
  reservations: "Reservation Management",
  calendar: "Availability Calendar",
  apartments: "Apartment Management",
  amenities: "Amenities",
  gallery: "Gallery",
  content: "Website Content",
  guests: "Guest Management",
  inquiries: "Contact Inquiries",
  reports: "Analytics & Reporting",
  settings: "Settings",
};

export default function AdminApp({ onExit }: { onExit: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const me = useQuery<{ user: { name: string; email: string } }>({
    queryKey: ["admin-me"],
    queryFn: async () => {
      try {
        return await apiGet("/api/admin/auth/me");
      } catch {
        throw new Error("unauthenticated");
      }
    },
    retry: false,
    staleTime: 5 * 60_000,
  });

  const notifications = useQuery<{ notifications: { id: string; type: string; title: string; body?: string | null; bookingId?: string | null; read: boolean; createdAt: string }[]; unreadCount: number; pendingCount: number }>({
    queryKey: ["admin-notifications"],
    queryFn: () => apiGet("/api/admin/notifications"),
    enabled: me.isSuccess,
    refetchInterval: 30_000,
  });

  const settingsQuery = useQuery<{ settings: Record<string, string> }>({
    queryKey: ["admin-settings"],
    queryFn: () => apiGet("/api/admin/settings"),
    enabled: me.isSuccess,
    staleTime: 60_000,
  });

  const markAllRead = async () => {
    await apiPatch("/api/admin/notifications", { all: true }).catch(() => null);
    qc.invalidateQueries({ queryKey: ["admin-notifications"] });
  };

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    qc.invalidateQueries({ queryKey: ["admin-me"] });
    toast({ title: "Signed out" });
  };

  const navigate = (t: string, q?: string) => {
    setTab(t as Tab);
    setSearchQuery(q || "");
    setMobileNav(false);
  };

  if (me.isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-ivory"><div className="h-8 w-8 rounded-full border-2 border-champagne border-t-transparent animate-spin" /></div>;
  }

  if (me.isError || !me.data?.user) {
    return <Login onSuccess={() => qc.invalidateQueries({ queryKey: ["admin-me"] })} />;
  }

  const currency = settingsQuery.data?.settings?.currency || "USD";

  return (
    <div className="min-h-screen flex bg-ivory">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-sidebar text-sidebar-foreground fixed inset-y-0 z-40">
        <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
          <span className="relative block h-9 w-9 overflow-hidden rounded-[4px]">
            <Image src="/brand/logo.png" alt="Zaura" fill sizes="36px" className="object-cover" />
          </span>
          <div className="leading-none">
            <p className="font-display text-base font-semibold">ZAURA</p>
            <p className="text-[0.55rem] tracking-[0.4em] mt-1 opacity-80">ZANZIBAR</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5" aria-label="Dashboard navigation">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => navigate(n.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-[3px] px-3.5 py-2.5 text-[13px] transition-colors text-left",
                tab === n.id ? "bg-sidebar-primary text-charcoal font-medium" : "text-ivory/75 hover:bg-sidebar-accent hover:text-ivory"
              )}
              aria-current={tab === n.id ? "page" : undefined}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
              {n.id === "reservations" && (notifications.data?.pendingCount || 0) > 0 && (
                <span className="ml-auto bg-champagne text-charcoal text-[10px] font-semibold rounded-full px-1.5 py-0.5">
                  {notifications.data?.pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button onClick={onExit} className="w-full flex items-center gap-3 rounded-[3px] px-3.5 py-2.5 text-[13px] text-ivory/75 hover:bg-sidebar-accent hover:text-ivory">
            <Globe className="h-4 w-4" /> View website
          </button>
          <button onClick={logout} className="w-full flex items-center gap-3 rounded-[3px] px-3.5 py-2.5 text-[13px] text-ivory/75 hover:bg-sidebar-accent hover:text-ivory">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile nav sheet */}
      {mobileNav && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-charcoal/60" onClick={() => setMobileNav(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-sidebar text-sidebar-foreground flex flex-col">
            <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
              <span className="font-display text-lg">ZAURA</span>
              <button onClick={() => setMobileNav(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  onClick={() => navigate(n.id)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-[3px] px-3.5 py-2.5 text-[13px] transition-colors text-left",
                    tab === n.id ? "bg-sidebar-primary text-charcoal font-medium" : "text-ivory/75"
                  )}
                >
                  <n.icon className="h-4 w-4" /> {n.label}
                </button>
              ))}
            </nav>
            <div className="p-3 border-t border-sidebar-border">
              <button onClick={onExit} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[13px] text-ivory/75"><Globe className="h-4 w-4" /> View website</button>
              <button onClick={logout} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[13px] text-ivory/75"><LogOut className="h-4 w-4" /> Sign out</button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-ivory/95 backdrop-blur border-b border-border px-5 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1.5" onClick={() => setMobileNav(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-display text-lg md:text-xl">{TAB_TITLES[tab]}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button className="relative p-2 rounded-[3px] hover:bg-muted transition-colors" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                  {(notifications.data?.unreadCount || 0) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-champagne text-charcoal text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {notifications.data?.unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-96 rounded-[3px] p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="eyebrow text-muted-foreground text-[0.6rem]">Notifications</p>
                  {(notifications.data?.unreadCount || 0) > 0 && (
                    <button onClick={markAllRead} className="text-xs text-champagne hover:underline">Mark all read</button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {(notifications.data?.notifications || []).length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
                  )}
                  {(notifications.data?.notifications || []).map((n) => {
                    const refMatch = n.title.match(/ZZA-\d{4}-\d{3,}/);
                    return (
                      <button
                        key={n.id}
                        onClick={() => {
                          // Mark read + deep-link into the matching reservation.
                          if (!n.read) {
                            apiPatch("/api/admin/notifications", { ids: [n.id] })
                              .then(() => qc.invalidateQueries({ queryKey: ["admin-notifications"] }))
                              .catch(() => null);
                          }
                          navigate("reservations", refMatch ? refMatch[0] : "");
                        }}
                        className={cn("w-full text-left px-4 py-3 border-b border-border/60 last:border-0 hover:bg-muted/50 transition-colors flex gap-3", !n.read && "bg-champagne/10")}
                      >
                        <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", n.read ? "bg-border" : "bg-champagne")} />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium truncate">{n.title}</span>
                          {n.body && <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</span>}
                          <span className="block text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <span className="hidden md:block text-xs text-muted-foreground border-l border-border pl-3">
              {me.data.user.name}
            </span>
            <Button variant="outline" size="sm" onClick={onExit} className="rounded-[3px] gap-1.5 eyebrow text-[0.6rem] hidden sm:inline-flex">
              <ExternalLink className="h-3 w-3" /> Site
            </Button>
          </div>
        </header>

        <main className="flex-1 px-5 md:px-8 py-7 print:!p-0">
          {tab === "overview" && <Overview currency={currency} onNavigate={navigate} />}
          {tab === "reservations" && (
            <Reservations
              key={searchQuery}
              currency={currency}
              initialQuery={searchQuery}
            />
          )}
          {tab === "calendar" && (
            <CalendarView
              onOpenBooking={(ref) => navigate("reservations", ref)}
            />
          )}
          {tab === "apartments" && <ApartmentsAdmin />}
          {tab === "amenities" && <AmenitiesAdmin />}
          {tab === "gallery" && <GalleryAdmin />}
          {tab === "content" && <ContentAdmin />}
          {tab === "guests" && <GuestsAdmin />}
          {tab === "inquiries" && <InquiriesAdmin />}
          {tab === "reports" && <ReportsAdmin currency={currency} />}
          {tab === "settings" && <SettingsAdmin />}
        </main>
      </div>
    </div>
  );
}
