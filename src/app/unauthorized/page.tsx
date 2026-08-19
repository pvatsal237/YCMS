import { auth } from "@/auth";
import { defaultHomePath } from "@/lib/authorization";
import Link from "next/link";

export default async function UnauthorizedPage() {
  const session = await auth();
  const role = session?.user?.role;
  const home = role ? defaultHomePath(role) : "/login";
  const canReviewVolunteers = role === "ADMIN" || role === "COORDINATOR";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">This page is not available for your sign-in</h1>
        <p className="mt-2 text-sm text-slate-600">
          {canReviewVolunteers
            ? "Pending Serve as Volunteer requests are under Volunteer requests in the left menu, or Notifications."
            : "You do not have access to that page."}
        </p>
        <div className="mt-4 flex flex-col items-center gap-2">
          {canReviewVolunteers ? (
            <>
              <Link href="/volunteers" className="text-sm font-medium text-teal-700">
                Open volunteer requests
              </Link>
              <Link href="/notifications" className="text-sm font-medium text-teal-700">
                Open notifications
              </Link>
            </>
          ) : null}
          <Link href={home} className="text-sm font-medium text-slate-700">
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
