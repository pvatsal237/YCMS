import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">You don’t have access to that page.</h1>
      <p className="mt-2 text-stone-600">Try going back to your home screen.</p>
      <Link href="/" className="mt-4 inline-block text-teal-800">Home</Link>
    </main>
  );
}
