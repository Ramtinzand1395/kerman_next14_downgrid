import { redirect } from "next/navigation";

export default function AccountsPage() {
  redirect("/my-profile?step=12");
}
