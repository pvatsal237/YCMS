export function AuthBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 10% -10%, rgba(13, 148, 136, 0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(15, 118, 110, 0.12), transparent)",
        }}
      />
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-10 h-72 w-72 text-teal-700/10"
        viewBox="0 0 200 200"
        fill="currentColor"
      >
        <circle cx="70" cy="80" r="54" />
        <circle cx="140" cy="70" r="36" />
        <circle cx="120" cy="140" r="48" />
      </svg>
      <div className="relative z-10 w-full max-w-3xl">{children}</div>
    </div>
  );
}

export function AuthBrand() {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
        <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden>
          <path
            d="M8 22c0-3.3 3.6-6 8-6s8 2.7 8 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="16" cy="11" r="4" stroke="currentColor" strokeWidth="2" />
          <path
            d="M6 20c-1.8.6-3 1.7-3 3M26 20c1.8.6 3 1.7 3 3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">YCMS</p>
        <p className="text-sm text-slate-500">Youth Community Management System</p>
      </div>
    </div>
  );
}
