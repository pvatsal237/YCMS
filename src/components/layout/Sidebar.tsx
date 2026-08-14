"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FileWarning,
  PhoneCall,
  BarChart3,
  UserCog,
  ScrollText,
  Settings,
  X,
} from "lucide-react";
import { navItemsForRole } from "@/lib/authorization";
import { cn } from "@/utils/format";
import type { UserRole } from "@/types/roles";

const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/members": Users,
  "/attendance": ClipboardCheck,
  "/immigration": FileWarning,
  "/follow-ups": PhoneCall,
  "/reports": BarChart3,
  "/admin/users": UserCog,
  "/admin/logs": ScrollText,
  "/settings": Settings,
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
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-slate-200 transition-transform lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/dashboard" className="font-semibold tracking-tight text-white">
          YCMS
        </Link>
        <button
          type="button"
          className="rounded p-1 text-slate-300 hover:bg-slate-800 lg:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const Icon = icons[item.href] ?? LayoutDashboard;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                active
                  ? "bg-teal-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="px-5 pb-5 text-xs text-slate-500">Youth Community Management</p>
    </aside>
  );
}
