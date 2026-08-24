

export interface User {
  _id: string;
  username: string;
  mobile: string;
  createdAt?: string;
}

export interface Product {
  _id: string;
  title: string;
  sku: string;
  mainImage: string;
  price: number;
}

export interface Comment {
  _id: string;
  text: string;
  rating: number;
  verified: boolean;
  user: User;
  product: Product;
}

export interface Order {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  user: User;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
}

export interface CustomerGameOrderProduct {
  name: string;
  platform?: string;
  price?: number;
  size?: number;
  gameType?: string;
}

export type CustomerGameOrderStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "completed";

export interface CustomerGameOrder {
  _id: string;
  customerName: string;
  phone: string;
  address?: string;
  message?: string;
  addressRef?: string;
  user?: {
    _id: string;
    username: string;
    mobile: string;
    createdAt?: string;
  };
  products: CustomerGameOrderProduct[];
  totalPrice: number;
  status: CustomerGameOrderStatus;
  createdAt: string;
}

// Target union
export type Target =
  | { kind: "Comment"; item: Comment }
  | { kind: "User"; item: User }
  | { kind: "Product"; item: Product }
  | { kind: "Order"; item: Order }
  | { kind: "ContactMessage"; item: ContactMessage }
  | { kind: "CustomerGameOrder"; item: CustomerGameOrder };

// Notification اصلی
export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: "comment" | "order" | "user" | "payment" | "contact" | "customerGameOrder";
  isRead: boolean;
  for: "admin" | "user";
  createdAt: string;
  target: Target;
}

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  createdAt: string;
}
