export function AuthBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  );
}

export function AuthBrand() {
  return (
    <div className="mb-5">
      <p className="text-sm font-semibold text-teal-800">YCMS</p>
      <p className="text-sm text-slate-600">Youth Community Management System</p>
    </div>
  );
}
