export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  category?: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  link?: string | null;
  priority?: "low" | "normal" | "high" | "urgent";
  entityType?: string | null;
  entityId?: string | null;
  target?: { kind?: string; item?: unknown };
}

export interface NotificationResponse {
  notifications: NotificationItem[];
  unreadCount: number;
  pagination: { page: number; limit: number; total: number; pages: number };
}
