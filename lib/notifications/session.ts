import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import type { NotificationRecipientRole } from "./service";

export async function getNotificationSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const recipientRole: NotificationRecipientRole =
    session.user.role === "user"
      ? "USER"
      : isAdminRole(session.user.role)
        ? "ADMIN"
        : session.user.role.toUpperCase();
  return { session, recipientRole };
}

export function isAdminRole(role?: string) {
  return role === "admin" || role === "superadmin";
}
