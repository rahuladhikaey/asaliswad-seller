"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { Bell, CheckCircle2, ShoppingBag, Info, AlertTriangle } from "lucide-react";

export default function SellerNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false });

        setNotifications(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadNotifications();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Notifications & Alerts</h1>
        <p className="text-xs font-bold text-text-secondary mt-1">
          Stay updated on incoming orders, stock alerts, and system announcements.
        </p>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-[2.5rem] bg-foreground/[0.03] border border-foreground/[0.06] p-12 text-center">
          <Bell size={40} className="mx-auto text-text-muted mb-3 opacity-50" />
          <h3 className="text-base font-black">No Notifications</h3>
          <p className="text-xs font-bold text-text-muted mt-1">You are all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="rounded-3xl bg-foreground/[0.03] border border-foreground/[0.06] p-5 flex items-start gap-4 hover:border-primary/30 transition-all backdrop-blur-xl"
            >
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Bell size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black">{notif.title}</h3>
                  <span className="text-[10px] font-bold text-text-muted">
                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs font-bold text-text-secondary mt-1">{notif.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
