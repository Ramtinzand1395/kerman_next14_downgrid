export interface ProductVariant {
  _id?: string;
  title: string;
  sku?: string;
  barcode?: string;
  price: number;
  discountPrice?: number | null;
  stock: number;
  isActive?: boolean;
}

export type VariantSelectorDisplayType =
  | "dropdown"
  | "radio"
  | "chips"
  | "swatches";

export interface VariantSelectorOption {
  id: string;
  label: string;
  order: number;
  color?: string;
}

export interface VariantSelectorGroup {
  id: string;
  key: string;
  label: string;
  displayType: VariantSelectorDisplayType;
  required: boolean;
  order: number;
  placeholder?: string;
  description?: string;
  options: VariantSelectorOption[];
}

export interface VariantSelectorMapping {
  variantId: string;
  optionIds: Record<string, string>;
}

export interface VariantSelectorConfig {
  enabled: boolean;
  version: 1;
  groups: VariantSelectorGroup[];
  mappings: VariantSelectorMapping[];
}

export interface VariantAttributeSelection {
  groupId: string;
  key: string;
  label: string;
  optionId: string;
  optionLabel: string;
}

export interface CartItem {
  id: string;
  title: string;
  productTitle?: string;
  image: string;
  price: number;
  quantity: number;
  discountPrice: number | null;
  sku?: string;
  stock?: number;
  productId: string;
  variantId?: string;
  variantTitle?: string;
  variantAttributes?: VariantAttributeSelection[];
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

interface User {
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

interface OTP {
  id: number;
  mobile: string;
  otp: number;
  createdAt: string | Date;
}
// !برای فرم محصول
interface ProductFaq {
  question: string;
  answer: string;
}

export interface ProductForm {
  status: "draft" | "published";
  productType: "single" | "multi";
  title: string;
  slug: string;
  sku?: string;
  barcode?: string | null;
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
  faqs: ProductFaq[];
  seoTitle: string;
  metaDescription: string;
  mainImageAlt: string;
  variants: ProductVariant[];
  defaultVariantId?: string | null;
  variantSelector?: VariantSelectorConfig;
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
export type ConsoleType = "ps5" | "ps4" | "xbox" | "copy" | "ps5Copy";
interface StoreOrder {
  _id: string;
  list: GameItem[];
  totalSize?: number;
  totalPrice?: number;
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

// export interface GameItem {
//   _id?: string;
//   name: string;
//   size: number;
//   price: number;
// }

// export interface GameList {
//   _id: string;
//   platform: ConsoleType;
//   items: GameItem[];
// }
// !این دو مورد به جای بالا اضافه شد
export interface GameItem {
  _id: string;

  name: string;

  size?: number;

  price?: number;

  storage?: string;
}

export interface GameList {
  platform: string;

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
  status?: "draft" | "published";
  productType?: "single" | "multi";
  variants?: ProductVariant[];
  defaultVariantId?: string | null;
  variantSelector?: VariantSelectorConfig;
  catalogRevision?: number;
  inventoryVersion?: number;
  deletedAt?: string | Date | null;
  _id: string;
  sku: string;
  barcode?: string | null;
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
  faqs?: ProductFaq[];
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
export interface ProductTagFacet extends Tag {
  count: number;
}
interface Favorite {
  _id: number;
  userId: number;
  productId: number;
  createdAt: string;
  user: User;
  product: Product;
}
export interface OrderItem {
  _id: string;
  orderId?: number | string;
  productId?: number | string;
  product?: Product;
  productTitle?: string;
  quantity: number;
  price: number;
  discountPrice?: number | null;
  total: number;
  order?: Order;
  variantId?: string;
  variantTitle?: string;
  variantSku?: string;
  variantAttributes?: VariantAttributeSelection[];
}

export type ShippingPaymentType = "PREPAID" | "COLLECT";
export type ShippingMethod = "kerman_local" | "national_collect";
export interface OrderShipping {
  method: ShippingMethod;
  title: string;
  feeToman: number | null;
  paymentTiming: "online" | "on_delivery";
  feeStatus: "fixed" | "pending_carrier";
  destinationCity: string;
  addressSnapshot?: Record<string, unknown>;
}

export interface Order {
  _id: string;
  userId?: number;
  addressId?: number;
  totalPrice: number;
  shippingCost: number | null;
  shippingPaymentType?: ShippingPaymentType;
  shipping?: OrderShipping | null;
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
  addressSnapshot?: Omit<Address, "_id" | "userId" | "createdAt" | "updatedAt">;
  items: OrderItem[];
}

export interface Comment {
  _id: string;
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

interface SpecificationItem {
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
  coverImageAlt?: string;
  published: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  seoTitle?: string;
  metaDescription?: string;
  focusKeyword?: string[];
  category?: string;
  tags?: string[];
}

