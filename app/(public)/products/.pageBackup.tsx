import { Product } from "@/types";
import Cart from "../components/Cart";
import SortProducts from "./components/SortProducts";
import Pagination from "./components/Pagination";
import FilterProducts from "./components/FilterProducts";

async function getProducts(params: {
  category?: string;
  sort?: string;
  page?: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = new URL(`${baseUrl}/api/products/all_products`);
  if (params.category) url.searchParams.append("category", params.category);
  if (params.sort) url.searchParams.append("sort", params.sort);
  if (params.page) url.searchParams.append("page", params.page);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("خطا در دریافت محصولات");
  return res.json();
}
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const resolvedParams = await searchParams; // ✅ ابتدا Promise را resolve کن

  const data = await getProducts(resolvedParams);
  const products = data.products;
  const totalPages = Math.ceil(data.total / data.limit);
  const currentPage = data.page;

  return (
    <section className="mx-4 md:mx-auto md:container my-5">
      <SortProducts length={products?.length} />
      <div className="flex mt-5 gap-8 items-start">
        {/* Sidebar */}
        <FilterProducts />
        {/* نمایش محصولات  */}
        <div className="grid  w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products && products.length > 0 ? (
            products.map((game: Product) => <Cart key={game._id} game={game} />)
          ) : (
            <p className="text-center text-gray-500 text-sm col-span-full py-10">
              محصولی یافت نشد.
            </p>
          )}
        </div>
      </div>
      <Pagination totalPages={totalPages} currentPage={currentPage} />
    </section>
  );
}
