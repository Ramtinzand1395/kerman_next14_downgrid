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
    addToCart({
      id: product.id!.toString(),
      title: product.title,
      price: product.price,
      discountPrice: product.discountPrice || null,
      image: product.mainImage,
      quantity: 1,
    });

    toast.success("به سبد خرید اضافه شد.");
  };
  return (
    <>
      <button
        onClick={() => handleAddToCart()}
        className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-red-200 transition-all transform active:scale-95 flex-1 max-w-[200px]"
      >
        افزودن به سبد
      </button>
    </>
  );
}
