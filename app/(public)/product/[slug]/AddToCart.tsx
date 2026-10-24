"use client";
import { toast } from "react-toastify";
import useCartStore from "@/stores/cartStore";
import { Product } from "@/types";
import { useMemo } from "react";
import { getVariantAttributeSelections } from "@/lib/variantSelector";

interface AddToCartProps {
  product: Product;
  selectedVariantId?: string;
}

export default function AddToCart({
  product,
  selectedVariantId,
}: AddToCartProps) {
  const { addToCart, cart } = useCartStore();

  const selectedVariant = useMemo(
    () =>
      product.variants?.find(
        (variant: any) => String(variant._id) === String(selectedVariantId),
      ),
    [product.variants, selectedVariantId],
  );

  const isMulti =
    product.productType === "multi" && (product.variants?.length || 0) > 0;

  const currentStock = isMulti
    ? Number(selectedVariant?.stock || 0)
    : Number(product.stock || 0);

  // قرارداد استاندارد: price = قیمت اصلی، discountPrice = قیمت تخفیف‌خورده (یا null)
  const originalPrice = isMulti
    ? Number(selectedVariant?.price || 0)
    : Number(product.price || 0);

  const discountPrice = isMulti
    ? (selectedVariant?.discountPrice ?? null)
    : (product.discountPrice ?? null);

  const useVariant = isMulti;
  const cartItemId = useVariant
    ? `${product._id}:${selectedVariantId}`
    : product._id.toString();

  const currentQuantityInCart =
    cart.find((item) => item.id === cartItemId)?.quantity || 0;
  const isAtStockLimit =
    currentStock > 0 && currentQuantityInCart >= currentStock;

  const handleAddToCart = () => {
    if (isMulti && !selectedVariantId) {
      toast.warning("برای افزودن محصول، ابتدا مدل موردنظر را انتخاب کنید.");
      return;
    }

    if (currentStock <= 0) {
      toast.info("این محصول فعلاً موجود نیست.");
      return;
    }

    const addResult = addToCart({
      id: cartItemId,
      productId: product._id.toString(),
      productTitle: product.title,
      title: useVariant && selectedVariant?.title
        ? `${product.title} (${selectedVariant.title})`
        : product.title,
      price: originalPrice,
      discountPrice,
      sku: useVariant ? (selectedVariant?.sku || product.sku) : product.sku,
      image: product.mainImage,
      quantity: 1,
      stock: currentStock,
      variantId: useVariant ? selectedVariantId : undefined,
      variantTitle: useVariant ? selectedVariant?.title : undefined,
      variantAttributes:
        useVariant && selectedVariantId
          ? getVariantAttributeSelections(product.variantSelector, selectedVariantId)
          : undefined,
    });

    if (addResult === "out_of_stock") {
      toast.info("این محصول فعلاً موجود نیست.");
      return;
    }

    if (addResult === "max_reached") {
      toast.warning("تعداد انتخابی بیشتر از موجودی فعلی است؛ تعداد را کاهش دهید.");
      return;
    }
    toast.success("محصول به سبد خرید اضافه شد.");
  };

  return (
    <>
      <button
        onClick={handleAddToCart}
        disabled={(isMulti && !selectedVariantId) || currentStock <= 0 || isAtStockLimit}
        className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs sm:text-base py-2 px-4 sm:py-3 sm:px-8 rounded-xl shadow-lg shadow-red-200 transition-all transform active:scale-95 flex-1 max-w-[200px] disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:shadow-none"
      >
        {isMulti && !selectedVariantId
          ? "انتخاب گزینه‌ها"
          : currentStock <= 0
          ? "ناموجود"
          : isAtStockLimit
            ? "بیش از موجودی انبار"
            : "افزودن به سبد"}
      </button>
    </>
  );
}
