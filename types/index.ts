export interface CartItem {
  id: string;
  title: string;
  image: string;
  price: number;
  quantity: number;
  discountPrice: number | null;
  sku?: string;
  stock?: number;
  productId: string;
  variantId?: string;
  variantTitle?: string;
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
  _id: string;
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
  addresses: Address;
  comments: Comment;
  orders: Order;
  favorites: Favorite;
}

export interface OTP {
  id: number;
  mobile: string;
  otp: number;
  createdAt: string | Date;
}
// !برای فرم محصول
export interface ProductForm {
  productType: "single" | "multi";
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
  galleryImages: { url: string; alt: string }[];
  specifications: { title: string; items: { key: string; value: string }[] }[];
  seoTitle: string;
  metaDescription: string;
  mainImageAlt: string;
  variants: {
    _id?: string;
    title: string;
    sku?: string;
    price: number;
    discountPrice?: number | null;
    stock: number;
  }[];
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
export type ConsoleType = "ps5" | "ps4" | "xbox" | "copy";
export interface StoreOrder {
  _id: string;
  list: string[];
  price: number | null;
  customer?: Customer | string;
  customerId?: string;
  description: string;
  consoleType: ConsoleType | "";
  deliveryStatus: string;
  createdAt: string;
  updatedAt: string;
  deliveryCode: string;
  deliveryDate: string;
}

export type storeOrder = StoreOrder;

export interface GameItem {
  _id: string;
  name: string;
  platform?: string;
}

export interface GameList {
  _id: string;
  platform: ConsoleType;
  items: GameItem[];
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
  productType?: "single" | "multi";
  variants?: {
    _id?: string;
    title: string;
    sku?: string;
    price: number;
    discountPrice?: number | null;
    stock: number;
  }[];
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
  images: ({ url: string; alt: string } | string)[];
  specifications: Specification[];
  comments: Comment[];
  favorites: Favorite[];
  OrderItem: OrderItem[];
  category: Category;
  User?: User;
  seoTitle: string;
  metaDescription: string;
  mainImageAlt: string;
}
export interface Tag {
  _id: string;
  name: string;
  slug: string;
}
export interface Favorite {
  _id: number;
  userId: number;
  productId: number;
  createdAt: string;
  user: User;
  product: Product;
}
export interface OrderItem {
  _id: string;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  total: number;
  order: Order;
  product: Product;
  variantId?: string;
  variantTitle?: string;
}

export interface Order {
  _id: string;
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
  id: string;
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
  _id: string;
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
  _id: string;
  title: string;
  productId?: number;
  product?: Product;
  items: SpecificationItem[];
}

export interface SpecificationItem {
  _id: string;
  key: string;
  value: string;
  specificationId: number;
  specification: Specification;
}

export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  metaDescription?: string;
  focusKeyword?: string[];
}
