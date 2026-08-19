import { logoutAction } from "@/actions/auth";
import { requireMemberSession } from "@/lib/session";
import Link from "next/link";

const LINKS = [
  { href: "/portal", label: "Home" },
  { href: "/portal#profile", label: "My Profile" },
  { href: "/portal#attendance", label: "Attendance" },
  { href: "/portal#serve", label: "Serve" },
  { href: "/portal#updates", label: "Updates" },
  { href: "/portal#requests", label: "My Requests" },
];

export default async function MemberPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireMemberSession();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">YCMS</p>
            <p className="text-sm font-medium text-slate-900">{user.name}</p>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="text-sm font-medium text-slate-700">
              Log out
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-4 overflow-x-auto px-4 pb-3 text-sm">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="whitespace-nowrap text-slate-600 hover:text-slate-900">
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
