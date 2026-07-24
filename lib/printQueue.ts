// /lib/printQueue.ts

export interface PrintJob {
  id: string;
  status: "pending" | "sent";
  payload: Record<string, any>;
}

// تعریف صف در حافظه موقت (برای محیط لوکال و پروژه‌های کم‌ترافیک)
export const globalPrintQueue: PrintJob[] = [];
