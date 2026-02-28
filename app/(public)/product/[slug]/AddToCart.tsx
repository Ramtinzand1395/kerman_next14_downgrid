"use client";
import { toast } from "react-toastify";
import useCartStore from "@/stores/cartStore";
import { Product } from "@/types";
import { useMemo } from "react";
interface AddToCartProps {
  product: Product;
  selectedVariantId?: string;
}
export default function AddToCart({
  product,
  selectedVariantId,
}: AddToCartProps) {
  const { addToCart, cart } = useCartStore();
  const BASE_VARIANT_ID = "__base__";

  const selectedVariant = useMemo(
    () =>
      product.variants?.find(
        (variant: any) => String(variant._id) === String(selectedVariantId),
      ),
    [product.variants, selectedVariantId],
  );

  const isMulti =
    product.productType === "multi" && (product.variants?.length || 0) > 0;
  const isBaseSelection = selectedVariantId === BASE_VARIANT_ID;
  const currentStock = isMulti
    ? isBaseSelection
      ? Number(product.stock || 0)
      : Number(selectedVariant?.stock || 0)
    : Number(product.stock || 0);
  const currentPrice = isMulti
    ? isBaseSelection
      ? Number(product.price || 0)
      : Number(selectedVariant?.price || 0)
    : Number(product.price || 0);
  const currentDiscountPrice = isMulti
    ? isBaseSelection
      ? (product.discountPrice ?? null)
      : (selectedVariant?.discountPrice ?? null)
    : (product.discountPrice ?? null);

  const useVariant = isMulti && !isBaseSelection;
  const cartItemId = useVariant
    ? `${product._id}:${selectedVariantId}`
    : product._id!.toString();
  const currentQuantityInCart =
    cart.find((item) => item.id === cartItemId)?.quantity || 0;
  const isAtStockLimit =
    currentStock > 0 && currentQuantityInCart >= currentStock;

  const handleAddToCart = () => {
    if (isMulti && !selectedVariantId) {
      toast.error("لطفاً مدل محصول را انتخاب کنید.");
      return;
    }

    if (currentStock <= 0) {
      toast.error("این محصول ناموجود است.");
      return;
    }

    const addResult = addToCart({
      id: cartItemId,
      productId: product._id!.toString(),
      title: useVariant
        ? `${product.title} - ${selectedVariant?.title || "مدل"}`
        : product.title,
      price: currentPrice,
      discountPrice: currentDiscountPrice,
      image: product.mainImage,
      quantity: 1,
      stock: currentStock,
      variantId: useVariant ? selectedVariantId : undefined,
      variantTitle: useVariant ? selectedVariant?.title : undefined,
    });
    if (addResult === "out_of_stock") {
      toast.error("این محصول ناموجود است.");
      return;
    }

    if (addResult === "max_reached") {
      toast.error("تعداد انتخابی از موجودی انبار بیشتر است.");
      return;
    }
    toast.success("به سبد خرید اضافه شد.");
  };
  return (
    <>
      <button
        onClick={handleAddToCart}
        disabled={currentStock <= 0 || isAtStockLimit}
        className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs sm:text-base py-2 px-4 sm:py-3 sm:px-8 rounded-xl shadow-lg shadow-red-200 transition-all transform active:scale-95 flex-1 max-w-[200px] disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:shadow-none"
      >
        {currentStock <= 0
          ? "ناموجود"
          : isAtStockLimit
            ? "بیش از موجودی انبار"
            : "افزودن به سبد"}
      </button>
    </>
  );
}
