import { Percent } from "lucide-react";
import Link from "@/app/components/navigation/NavigationFeedback";
import ProductImage from "@/app/components/ProductImage";
import { calculateDiscountPercent, formatPrice } from "@/helpers/Price";
import type { LandingOffer } from "@/lib/landing-offers";
import { OffersCountdown, OffersSlider } from "./LandingOffersControls";

export default function LandingSpecialOffers({ offers }: { offers: LandingOffer[] }) {
  if (offers.length === 0) return null;

  const endsAt = Date.parse(process.env.HOME_SPECIAL_OFFERS_END_AT || "");
  const initialSeconds = Math.ceil((endsAt - Date.now()) / 1000);

  return (
    <section
      aria-labelledby="special-offers-heading"
      className="landing-section rounded-[28px] border border-[#174f9f] bg-[#061f4f] p-4 text-white shadow-[0_22px_55px_rgba(5,35,86,0.18)] sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="special-offers-heading" className="flex items-center gap-2 text-xl font-black sm:text-2xl lg:text-[28px]">
          <Percent className="size-5 text-[#9ec3ff]" aria-hidden="true" />
          پیشنهاد ویژه
        </h2>
        {initialSeconds > 0 && (
          <OffersCountdown endsAt={endsAt} initialSeconds={initialSeconds} />
        )}
      </div>

      <OffersSlider>
        {offers.map((offer) => {
          const percent = offer.discountPrice === 0
            ? 100
            : calculateDiscountPercent(offer.price, offer.discountPrice);

          return (
            <li key={offer.slug} className="w-[min(46%,10rem)] shrink-0 snap-start sm:w-48 lg:w-52">
              <Link
                href={offer.href}
                className="group flex h-full flex-col rounded-xl border border-[#e2ebfb] bg-white p-2.5 text-[#0b1d48] transition hover:border-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-300 sm:p-3"
              >
                <div className="relative aspect-square overflow-hidden rounded-lg bg-[#f7f9fd]">
                  <ProductImage
                    src={offer.image}
                    alt={offer.imageAlt}
                    width={320}
                    height={320}
                    sizes="(max-width: 639px) 160px, (max-width: 1023px) 192px, 208px"
                    loading="lazy"
                    className="h-full w-full object-contain p-1 transition group-hover:scale-[1.03]"
                  />
                  {percent > 0 && (
                    <span className="absolute start-1.5 top-1.5 rounded-md bg-[#1469f5] px-2 py-1 text-xs font-black text-white">
                      {formatPrice(percent)}٪
                    </span>
                  )}
                </div>
                <h3 className="mt-2 line-clamp-2 min-h-10 text-xs font-black leading-5 sm:text-sm">
                  {offer.title}
                </h3>
                {offer.variantTitle && (
                  <span className="mt-1 line-clamp-1 text-xs text-slate-500">{offer.variantTitle}</span>
                )}
                <div className="mt-auto pt-2.5">
                  <del className="block text-xs text-slate-500">{formatPrice(offer.price)}</del>
                  <span className="text-sm font-black text-[#1262e7]">{formatPrice(offer.discountPrice)} تومان</span>
                  {!offer.inStock && <span className="block text-xs text-slate-500">ناموجود</span>}
                </div>
              </Link>
            </li>
          );
        })}
      </OffersSlider>
    </section>
  );
}
