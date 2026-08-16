import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { defaultHomePath } from "@/lib/authorization";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  redirect(defaultHomePath(session.user.role));
}
