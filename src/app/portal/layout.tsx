import { logoutAction } from "@/actions/auth";
import { requireMemberSession } from "@/lib/session";

export default async function MemberPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireMemberSession();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">YCMS</p>
          <p className="text-sm font-medium text-slate-900">{user.name}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="text-sm font-medium text-teal-700">
            Log out
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
