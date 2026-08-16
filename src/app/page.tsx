import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { defaultHomePath } from "@/lib/authorization";
import { SignInChooser } from "@/components/auth/SignInChooser";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect(defaultHomePath(session.user.role));
  }
  return <SignInChooser />;
}
