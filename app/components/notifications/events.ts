export const NOTIFICATION_UPDATED_EVENT = "notification-center-updated";

export function announceNotificationUpdate() {
  window.dispatchEvent(new CustomEvent(NOTIFICATION_UPDATED_EVENT));
}
