"use client";
import { toast } from "react-toastify";
import useCartStore from "@/stores/cartStore";
import { Product } from "@/types";
interface AddToCartProps {
  product: Product;
}
export default function AddToCart({ product }: AddToCartProps) {
  const { addToCart } = useCartStore();

  const handleAddToCart = () => {
     if (product.stock <= 0) {
       toast.error("این محصول ناموجود است.");
       return;
    }
    addToCart({
      id: product._id!.toString(),
      title: product.title,
      price: product.price,
      discountPrice: product.discountPrice || null,
      image: product.mainImage,
      quantity: 1,
      stock: product.stock,
    });

    toast.success("به سبد خرید اضافه شد.");
  };
  return (
    <>
      <button
 onClick={handleAddToCart}
        disabled={product.stock <= 0}
         className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs sm:text-base py-2 px-4 sm:py-3 sm:px-8 rounded-xl shadow-lg shadow-red-200 transition-all transform active:scale-95 flex-1 max-w-[200px] disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:shadow-none"      >
       {product.stock > 0 ? "افزودن به سبد" : "ناموجود"}
      </button>
    </>
  );
}
