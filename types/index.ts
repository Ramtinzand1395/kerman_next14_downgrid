export interface CartItem {
  id: string | number;
  title: string;
  image: string;
  price: number;
  quantity: number;
  discountPrice: number | null;
  sku?: string;
}

export interface CartStoreStateType {
  cart: CartItem[];
  hasHydrated: boolean;
}

export type UserProfileForm = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
} & User;

export type ProfileFormPayload = {
  username: string;
  gender?: string;
  birthday?: string;
  nationalCode?: string;
  email: string;
  mobile: string;
  newsletter: boolean;
};

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  mobile: string;
  role: "user" | "admin" | "superadmin";
  otps?: OTP[];
  newsletter: boolean;
  gender?: string;
  birthday?: string;
  nationalCode?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface OTP {
  id: number;
  mobile: string;
  otp: number;
  createdAt: string | Date;
}
// !برای فرم محصول
export interface ProductForm {
  title: string;
  slug: string;
  price: number;
  discountPrice?: number | null;
  stock: number;
  brand: string;
  description: string;
  shortDesc: string;
  category?: string;
  tags: string[];
  mainImage: string; // فقط URL
  galleryImages: string[]; // URL[]
  specifications: { title: string; items: { key: string; value: string }[] }[];
}

export interface Customer {
  _id: string;
  name: string;
  mobile: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
  sex: string;
  birthday: string;
  description: string;
}
type ConsoleType = "ps5" | "ps4" | "xbox" | "copy";

export interface storeOrder {
  _id: string;
  list: string[];
  price: number | null;
  customer?: Customer | string;
  customerId?:string;
  description: string;
  consoleType: ConsoleType | string;
  deliveryStatus: string;
  createdAt: string;
  updatedAt: string;
  deliveryCode: string;
  deliveryDate: string;
}
// !لیست بازی ها
export interface GameItem {
  _id: string;
  name: string;
  platform?: string;
}

export interface GameList {
  _id: string;
  platform: "ps5" | "ps4" | "کپی خور" | "xbox";
  items: GameItem[];
}
// !پاک بشه
export interface Favorite {
  id: number;
  userId: number;
  productId: number;
  createdAt: string;
  user: User;
  product: Product;
}

export interface Order {
  id: number;
  userId?: number;
  addressId?: number;
  totalPrice: number;
  shippingCost: number;
  finalPrice: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  trackingCode?: string;
  invoiceNumber?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;

  user?: User;
  address?: Address;
  items: OrderItem[];
}

export interface Comment {
  id: number;
  text: string;
  rating: number;
  userId: number;
  productId?: number;
  verified: boolean;
  createdAt: string;
  user?: User;
  product?: Product;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  parent?: { _id: string; name: string } | null;
}

export interface Product {
  _id: string;
  sku: string;
  title: string;
  slug: string;
  description: string;
  shortDesc?: string;
  price: number;
  discountPrice?: number | null;
  stock: number;
  brand?: string;
  mainImage: string;
  createdAt: string;
  updatedAt: string;
  userId?: number;
  categoryId: number;
  tags: Tag[];
  images: string[];
  specifications: Specification[];
  comments: Comment[];
  favorites: Favorite[];
  OrderItem: OrderItem[];
  category: Category;
  User?: User;
}
export interface Tag {
  _id: string;
  name: string;
  slug: string;
}
export interface Favorite {
  id: number;
  userId: number;
  productId: number;
  createdAt: string;
  user: User;
  product: Product;
}
export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  total: number;
  order: Order;
  product: Product;
}

export interface Order {
  id: number;
  userId?: number;
  addressId?: number;
  totalPrice: number;
  shippingCost: number;
  finalPrice: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  trackingCode?: string;
  invoiceNumber?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;

  user?: User;
  address?: Address;
  items: OrderItem[];
}

export interface Comment {
  id: number;
  text: string;
  rating: number;
  userId: number;
  productId?: number;
  verified: boolean;
  createdAt: string;
  user?: User;
  product?: Product;
}

export interface Address {
  _id: number;
  userId: number;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  plaque: string;
  unit: string;
  receiverPhone: string;
  createdAt: string;
  updatedAt: string;
}

export interface Specification {
  id: number;
  title: string;
  productId?: number;
  product?: Product;
  items: SpecificationItem[];
}

export interface SpecificationItem {
  id: number;
  key: string;
  value: string;
  specificationId: number;
  specification: Specification;
}
