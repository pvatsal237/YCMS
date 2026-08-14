import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          The page you requested does not exist or you do not have access to it.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-teal-700">
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}
