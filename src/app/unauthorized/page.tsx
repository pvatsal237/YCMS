import { redirect } from "next/navigation";

export default function UnauthorizedRedirect() {
  redirect("/login");
}
