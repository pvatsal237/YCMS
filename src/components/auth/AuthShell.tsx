export function AuthBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

export function AuthBrand() {
  return (
    <div className="mb-8 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">YCMS</p>
      <p className="mt-2 text-sm text-slate-500">Youth Community Management System</p>
    </div>
  );
}
