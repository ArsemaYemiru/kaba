import { redirect } from "next/navigation";

/** One sign-in page for members and staff (spec §5.1, A-7). */
export default function AdminLogin() {
  redirect("/sign-in?next=/admin");
}
