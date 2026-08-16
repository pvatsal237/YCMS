import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Not authorized</h1>
        <p className="mt-2 text-sm text-slate-600">
          You do not have permission to perform this action.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-teal-700">
          Return home
        </Link>
      </div>
    </div>
  );
}
