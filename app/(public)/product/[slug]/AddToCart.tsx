"use client";
import { toast } from "react-toastify";
import useCartStore from "@/stores/cartStore";
import { Product } from "@/types";
import { useMemo } from "react";
interface AddToCartProps {
  product: Product;
    selectedVariantId?: string;
}
export default function AddToCart({ product, selectedVariantId }: AddToCartProps) {
    const { addToCart } = useCartStore();

  const selectedVariant = useMemo(
  () =>
    product.variants?.find(
      (variant: any) => String(variant._id) === String(selectedVariantId),
    ),
  [product.variants, selectedVariantId],
);
 
const isMulti = product.productType === "multi" && (product.variants?.length || 0) > 0;
const currentStock = isMulti ? Number(selectedVariant?.stock || 0) : product.stock;
const currentPrice = isMulti ? Number(selectedVariant?.price || 0) : product.price;
const currentDiscountPrice = isMulti
  ? selectedVariant?.discountPrice ?? null
  : product.discountPrice || null;

  const handleAddToCart = () => {
    if (isMulti && !selectedVariantId) {
      toast.error("لطفاً مدل محصول را انتخاب کنید.");
      return;
    }

    if (currentStock <= 0) {
      toast.error("این محصول ناموجود است.");
      return;
    }

    const cartItemId = isMulti
      ? `${product._id}:${selectedVariantId}`
      : product._id!.toString();

    addToCart({
      id: cartItemId,
      productId: product._id!.toString(),
      title: isMulti
        ? `${product.title} - ${selectedVariant?.title || "مدل"}`
        : product.title,
      price: currentPrice,
      discountPrice: currentDiscountPrice,
      image: product.mainImage,
      quantity: 1,
      stock: currentStock,
      variantId: isMulti ? selectedVariantId : undefined,
      variantTitle: isMulti ? selectedVariant?.title : undefined,
    });

    toast.success("به سبد خرید اضافه شد.");
  };
  return (
    <>
    

      <button
        onClick={handleAddToCart}
        disabled={currentStock <= 0}
        className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs sm:text-base py-2 px-4 sm:py-3 sm:px-8 rounded-xl shadow-lg shadow-red-200 transition-all transform active:scale-95 flex-1 max-w-[200px] disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:shadow-none"
      >
        {currentStock > 0 ? "افزودن به سبد" : "ناموجود"}
      </button>
    </>
  );
}
