"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Calendar, ClipboardList, Home, MessageCircle, Users, X, BarChart3 } from "lucide-react";
import { APP_SHORT_NAME, defaultHomePath, navItemsForRole } from "@/lib/authorization";
import { cn } from "@/utils/format";
import type { UserRole } from "@/types/roles";

const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  "/dashboard": Home,
  "/events": Calendar,
  "/members": Users,
  "/guidance": MessageCircle,
  "/reports": BarChart3,
  "/notifications": Bell,
  "/portal": Home,
  "/portal/events": Calendar,
  "/portal/guidance": MessageCircle,
  "/portal/profile": Users,
  "/portal/notifications": Bell,
};

export function Sidebar({
  role,
  open,
  onClose,
}: {
  role: UserRole;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-stone-200 bg-white text-stone-800 transition-transform lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className="flex h-16 items-center justify-between px-5">
        <Link href={defaultHomePath(role)} className="text-sm font-semibold tracking-tight text-teal-800">
          {APP_SHORT_NAME}
        </Link>
        <button type="button" className="rounded p-1 lg:hidden" onClick={onClose} aria-label="Close navigation">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const Icon = icons[item.href] ?? ClipboardList;
          const active = pathname === item.href || (item.href !== "/portal" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                active ? "bg-teal-700 text-white" : "text-stone-600 hover:bg-stone-100",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
