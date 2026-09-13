import AdminNotificationComposer from "@/app/components/notifications/AdminNotificationComposer";
import NotificationCenter from "@/app/components/notifications/NotificationCenter";

export default function AdminNotificationsPage() {
  return <div className="space-y-6 p-4 md:p-6"><AdminNotificationComposer /><NotificationCenter title="اعلان‌های مدیریت" adminActions /></div>;
}
