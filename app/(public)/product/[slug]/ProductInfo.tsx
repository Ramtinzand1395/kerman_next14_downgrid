import { ShieldCheck, Truck, RotateCcw, Box, Store } from "lucide-react";
import { Comment, Product } from "@/types";
import AddToCart from "./AddToCart";
import {
  calculateDiscountPercent,
  formatPrice,
  toPersianDigits,
} from "@/helpers/Price";
import AddCommentButton from "./AddCommentButton";

interface ProductInfoProps {
  product: Product;
}

export const ProductInfo = ({ product }: ProductInfoProps) => {
  const rating = product.comments?.length
    ? product.comments.reduce((t: number, c: Comment) => t + c.rating, 0) /
      product.comments.length
    : 0;
  return (
    <div className="flex flex-col h-full">
      {/* Brand & Category */}
      <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium mb-2">
        <a href="#" className="hover:underline">
          {product.brand}
        </a>
        <span className="text-gray-300">/</span>
        <a href="#" className="hover:underline">
          {product.category.name}
        </a>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 leading-snug mb-3">
        {product.title}
      </h1>
      <span className="text-gray-400 text-sm mb-4 block dir-ltr text-right">
        SKU: {product.sku}
      </span>

      {/* Rating & Reviews */}
      <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-6">
        <div className="flex items-center gap-2 text-sm">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={`text-lg ${
                rating >= i ? "text-yellow-400" : "text-gray-300"
              }`}
            >
              ★
            </span>
          ))}
          <span className="text-gray-500">
            {product.comments?.length ? rating.toFixed(1) : "بدون امتیاز"}
          </span>
          <span className="text-gray-400">
            ({product.comments?.length || 0} نظر)
          </span>
        </div>
        <div className="h-4 w-px bg-gray-300"></div>
          <AddCommentButton />
      </div>

      {/* Features Summary */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-800 mb-3">درباره محصول</h3>

        <p>{product.shortDesc}</p>
      </div>

      {/* Services/Trust Badges */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span className="text-xs font-medium text-gray-700">
            گارانتی ۱۸ ماهه
          </span>
        </div>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
          <Truck className="w-5 h-5 text-rose-500" />
          <span className="text-xs font-medium text-gray-700">ارسال سریع</span>
        </div>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
          <RotateCcw className="w-5 h-5 text-blue-500" />
          <span className="text-xs font-medium text-gray-700">
            ۷ روز ضمانت بازگشت
          </span>
        </div>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
          <Store className="w-5 h-5 text-orange-500" />
          <span className="text-xs font-medium text-gray-700">
            تضمین اصالت کالا
          </span>
        </div>
      </div>
      {/* tags */}
      <div className="flex items-center gap-3">
        {product.tags.map((tag) => (
          <p className="bg-blue-500 px-3 py-2 text-xs rounded-md text-white ">
            {tag.name}
          </p>
        ))}
      </div>
      {/* Price Box */}
      <div className="mt-auto bg-gray-50 rounded-2xl p-5 border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">
            <Box className="w-4 h-4" />
            <span className="text-sm font-medium">
              موجود در انبار ({toPersianDigits(product.stock)} عدد)
            </span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 mt-4">
          <div>
            {product.discountPrice ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gray-400 line-through text-sm">
                    {formatPrice(product.price)}
                  </span>
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {toPersianDigits(
                      calculateDiscountPercent(
                        product.price,
                        product.discountPrice
                      )
                    )}
                    %
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(product.discountPrice)}
                  </span>
                  <span className="text-sm text-gray-500 font-medium">
                    تومان
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-3xl font-bold text-gray-900">
                  {formatPrice(product.price)}
                </span>
                <span className="text-sm text-gray-500 font-medium">تومان</span>
              </div>
            )}
          </div>

          <AddToCart product={product} />
        </div>
      </div>
    </div>
  );
};
