import Link from "next/link";

const CHOICES = [
  {
    href: "/member-login",
    title: "Member login",
    description: "Sign in with an email code. No password.",
    primary: true,
  },
  {
    href: "/login?role=admin",
    title: "Administrator login",
    description: "Sign in with email and password.",
    primary: false,
  },
  {
    href: "/login?role=coordinator",
    title: "Youth Coordinator login",
    description: "Sign in with email and password.",
    primary: false,
  },
  {
    href: "/login?role=volunteer",
    title: "Attendance Volunteer login",
    description: "Sign in with email and password.",
    primary: false,
  },
] as const;

export function SignInChooser() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">YCMS</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Choose how to sign in</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Members use an email code. Staff use email and password.
        </p>
        <div className="grid gap-3">
          {CHOICES.map((choice) => (
            <Link
              key={choice.href}
              href={choice.href}
              className={
                choice.primary
                  ? "block rounded-md bg-teal-700 px-4 py-3 text-white hover:bg-teal-800"
                  : "block rounded-md border border-slate-300 px-4 py-3 text-slate-800 hover:bg-slate-50"
              }
            >
              <span className="block text-sm font-semibold">{choice.title}</span>
              <span
                className={
                  choice.primary
                    ? "mt-0.5 block text-sm text-teal-50"
                    : "mt-0.5 block text-sm text-slate-500"
                }
              >
                {choice.description}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
