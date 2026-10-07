import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock3,
  Disc3,
  Gamepad2,
  HardDrive,
  ListTree,
  Monitor,
  PackageCheck,
  SearchCheck,
  ShieldAlert,
  Sparkles,
  WalletCards,
  Wrench,
} from "lucide-react";
import Motion from "../../components/Motion";
import type {
  BuyingGuide,
  GuideBlock,
  GuideImage,
} from "@/lib/guides/types";

const quickChoiceIcons = [Gamepad2, Disc3, Monitor, HardDrive, PackageCheck];

function GuideFigure({ image }: { image: GuideImage }) {
  const aspectClass = {
    "4/3": "aspect-[4/3]",
    "16/9": "aspect-video",
    "3/1": "aspect-[3/1]",
  }[image.aspect];

  return (
    <figure className="my-8 overflow-hidden rounded-3xl border border-blue-100 bg-[#f7faff] shadow-[0_16px_40px_rgba(19,74,149,0.08)]">
      <div className={`relative w-full ${aspectClass}`}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          loading="lazy"
          sizes="(max-width: 1023px) calc(100vw - 32px), 760px"
          className={image.fit === "contain" ? "object-contain p-3 sm:p-5" : "object-cover"}
          style={{ objectPosition: image.objectPosition }}
        />
      </div>
      <figcaption className="border-t border-blue-100 px-4 py-3 text-sm leading-6 text-slate-500 sm:px-5">
        {image.caption}
      </figcaption>
    </figure>
  );
}

function ComparisonTable({ block }: { block: Extract<GuideBlock, { type: "table" }> }) {
  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-blue-100 bg-white">
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="min-w-[760px] border-collapse text-right text-sm leading-6 text-slate-700">
          <caption className="border-b border-blue-100 bg-blue-50/70 px-4 py-3 text-right font-black text-[#0b3d91]">
            {block.table.caption}
          </caption>
          <thead>
            <tr className="bg-[#0b4aa8] text-white">
              {block.table.columns.map((column) => (
                <th key={column} scope="col" className="px-4 py-3 font-black">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.table.rows.map((row, index) => (
              <tr key={row.label} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <th scope="row" className="border-t border-slate-100 px-4 py-4 align-top font-black text-slate-900">
                  {row.label}
                </th>
                {row.cells.map((cell) => (
                  <td key={cell} className="border-t border-slate-100 px-4 py-4 align-top">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GuideBlockView({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case "paragraph":
      return <p className="mt-4 text-[16px] leading-[2] text-slate-700 md:text-[17px]">{block.text}</p>;
    case "subheading":
      return <h3 className="mt-8 text-xl font-black text-slate-900">{block.title}</h3>;
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List className={`mt-5 space-y-3 pr-1 text-[16px] leading-8 text-slate-700 md:text-[17px] ${block.ordered ? "list-none [counter-reset:guide-step]" : "list-none"}`}>
          {block.items.map((item, index) => (
            <li key={item} className={`relative flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 ${block.ordered ? "[counter-increment:guide-step]" : ""}`}>
              <span className="mt-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">
                {block.ordered ? index + 1 : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </List>
      );
    }
    case "callout":
      return (
        <aside className="my-7 rounded-2xl border border-blue-200 bg-gradient-to-l from-blue-50 to-white p-5 shadow-[0_10px_25px_rgba(20,91,190,0.06)]">
          <h3 className="flex items-center gap-2 text-base font-black text-[#0b4aa8]">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            {block.title}
          </h3>
          <p className="mt-2 text-[15px] leading-8 text-slate-700 md:text-base">{block.text}</p>
        </aside>
      );
    case "inspection": {
      const toneStyles = {
        check: {
          icon: SearchCheck,
          card: "border-emerald-200 bg-emerald-50/60",
          badge: "bg-emerald-100 text-emerald-800",
        },
        ask: {
          icon: ShieldAlert,
          card: "border-amber-200 bg-amber-50/60",
          badge: "bg-amber-100 text-amber-800",
        },
        expert: {
          icon: Wrench,
          card: "border-blue-200 bg-blue-50/60",
          badge: "bg-blue-100 text-blue-800",
        },
      } as const;

      return (
        <div className="my-8">
          <p className="text-[16px] leading-8 text-slate-700 md:text-[17px]">{block.intro}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {block.groups.map((group) => {
              const styles = toneStyles[group.tone];
              const Icon = styles.icon;
              return (
                <section key={group.title} className={`rounded-2xl border p-4 ${styles.card}`}>
                  <h3 className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-black ${styles.badge}`}>
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {group.title}
                  </h3>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                    {group.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <Check className="mt-1.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600">{block.note}</p>
        </div>
      );
    }
    case "figure":
      return <GuideFigure image={block.image} />;
    case "table":
      return <ComparisonTable block={block} />;
  }
}

export function GuideHero({ guide, readingMinutes }: { guide: BuyingGuide; readingMinutes: number }) {
  return (
    <>
      <nav aria-label="مسیر راهنما" className="mb-4 text-sm text-slate-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="rounded-md hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">خانه</Link></li>
          <li aria-hidden="true"><ChevronLeft className="h-4 w-4" /></li>
          <li><Link href="/products?category=consoles&sort=newest&page=1" className="rounded-md hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">کنسول‌ها</Link></li>
          <li aria-hidden="true"><ChevronLeft className="h-4 w-4" /></li>
          <li aria-current="page" className="font-bold text-slate-800">{guide.breadcrumbLabel}</li>
        </ol>
      </nav>

      <Motion direction="down" distance={14} duration={0.45}>
        <header className="overflow-hidden rounded-[30px] border border-blue-100 bg-white shadow-[0_24px_70px_rgba(12,69,154,0.12)] lg:grid lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="flex flex-col justify-center p-5 sm:p-8 lg:min-h-[480px] lg:p-10 xl:p-12">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 sm:text-sm">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              {guide.label}
            </span>
            <h1 className="mt-5 text-3xl font-black leading-[1.45] text-[#091f4b] sm:text-4xl lg:text-[46px] lg:leading-[1.35]">
              {guide.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 sm:text-[17px]">
              {guide.intro}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <a href="#model-comparison" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1469f5] px-5 text-sm font-black text-white transition hover:bg-[#0c56cf] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                {guide.comparisonCtaLabel} <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </a>
              <Link href={guide.productHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-5 text-sm font-black text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                {guide.productsCtaLabel} <Gamepad2 className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-5 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-blue-600" aria-hidden="true" />حدود {readingMinutes.toLocaleString("fa-IR")} دقیقه مطالعه</span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-blue-600" aria-hidden="true" />انتشار و بازبینی: {guide.publishedLabel}</span>
            </div>
          </div>
          <figure className="relative aspect-[4/3] w-full overflow-hidden bg-[#eaf3ff] lg:ml-6 lg:my-8 lg:w-[calc(100%-1.5rem)] lg:max-w-[560px] lg:rounded-[24px]">
            <Image
              src={guide.heroImage.src}
              alt={guide.heroImage.alt}
              fill
              priority
              quality={90}
              sizes="(max-width: 1023px) 100vw, 560px"
              className={guide.heroImage.fit === "contain" ? "object-contain p-4 sm:p-6" : "object-cover"}
              style={{ objectPosition: guide.heroImage.objectPosition }}
            />
            <figcaption className="absolute inset-x-4 bottom-4 rounded-xl bg-[#071b42]/85 px-4 py-3 text-xs leading-6 text-blue-50 backdrop-blur-sm sm:text-sm">
              {guide.heroImage.caption}
            </figcaption>
          </figure>
        </header>
      </Motion>
    </>
  );
}

export function QuickChoices({ guide }: { guide: BuyingGuide }) {
  return (
    <Motion distance={12} duration={0.4}>
      <section aria-labelledby="quick-choice-heading" className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_14px_40px_rgba(20,74,145,0.07)] sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><ListTree className="h-5 w-5" aria-hidden="true" /></span>
          <div><p className="text-xs font-black text-blue-600">خلاصه انتخاب</p><h2 id="quick-choice-heading" className="mt-0.5 text-xl font-black text-slate-900 sm:text-2xl">از سناریوی خودتان شروع کنید</h2></div>
        </div>
        <div className={`mt-5 grid gap-3 md:grid-cols-2 ${guide.quickChoices.length === 5 ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
          {guide.quickChoices.map((choice, index) => {
            const Icon = quickChoiceIcons[index] || Gamepad2;
            return (
              <article key={choice.title} className="rounded-2xl border border-slate-100 bg-[#f8fbff] p-4">
                <Icon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                <h3 className="mt-3 font-black text-slate-900">{choice.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{choice.answer}</p>
              </article>
            );
          })}
        </div>
      </section>
    </Motion>
  );
}

function TocLinks({ guide }: { guide: BuyingGuide }) {
  return (
    <ol className="space-y-1.5">
      {guide.sections.map((section, index) => (
        <li key={section.id}>
          <a href={`#${section.id}`} className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm leading-6 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <span className="text-xs font-black text-blue-500">{(index + 1).toLocaleString("fa-IR")}</span>{section.title}
          </a>
        </li>
      ))}
      <li><a href="#faq" className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">پرسش‌های متداول</a></li>
      <li><a href="#sources" className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">منابع و اعتبار تصاویر</a></li>
    </ol>
  );
}

export function GuideContent({ guide }: { guide: BuyingGuide }) {
  return (
    <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,780px)_260px] lg:items-start lg:gap-8 xl:gap-12">
      <details className="mb-5 rounded-2xl border border-blue-100 bg-white p-3 shadow-sm lg:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-2 font-black text-slate-900"><ListTree className="h-5 w-5 text-blue-600" aria-hidden="true" />فهرست مطالب</summary>
        <div className="border-t border-slate-100 pt-3"><TocLinks guide={guide} /></div>
      </details>

      <article className="min-w-0 rounded-3xl border border-blue-100 bg-white px-5 py-7 shadow-[0_16px_50px_rgba(19,68,138,0.07)] sm:px-8 sm:py-9 lg:px-10">
        {guide.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24 border-b border-slate-100 py-8 first:pt-0 last:border-b-0 last:pb-0">
            <h2 className="text-2xl font-black leading-[1.5] text-[#0a265b] sm:text-[28px]">{section.title}</h2>
            {section.blocks.map((block, index) => <GuideBlockView key={`${section.id}-${index}`} block={block} />)}
          </section>
        ))}

        <section id="faq" className="scroll-mt-24 border-t border-slate-100 pt-10">
          <p className="text-xs font-black text-blue-600">سؤال‌های پرتکرار خریداران</p>
          <h2 className="mt-2 text-2xl font-black text-[#0a265b] sm:text-[28px]">{guide.faqTitle}</h2>
          <div className="mt-5 space-y-3">
            {guide.faqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border border-slate-200 bg-slate-50/60 open:border-blue-200 open:bg-blue-50/40">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-black text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden">
                  {faq.question}<span className="text-xl text-blue-600 transition group-open:rotate-45">+</span>
                </summary>
                <p className="border-t border-slate-200 px-4 py-4 text-[15px] leading-8 text-slate-700 sm:text-base">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="sources" className="scroll-mt-24 mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-black text-slate-900">منابع و اعتبار تصاویر</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">مشخصات متغیر و نکات سازگاری در تاریخ بازبینی مقاله با صفحات رسمی سازنده تطبیق داده شده‌اند؛ اعتبار و مجوز تصاویر خارجی نیز کنار هر تصویر و در فهرست زیر آمده است.</p>
          <ul className="mt-4 space-y-3">
            {guide.sources.map((source) => (
              <li key={source.href}>
                <a href={source.href} target="_blank" rel="noopener noreferrer" className="group flex min-h-11 items-start gap-2 rounded-xl bg-white px-3 py-2.5 text-sm text-slate-600 transition hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
                  <span><strong className="block font-black text-slate-900 group-hover:text-blue-700">{source.label}</strong>{source.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </article>

      <aside aria-label="فهرست مطالب مقاله" className="sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-blue-100 bg-white p-3 shadow-[0_12px_35px_rgba(18,67,135,0.07)] lg:block">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 pb-3 font-black text-slate-900"><ListTree className="h-5 w-5 text-blue-600" aria-hidden="true" />فهرست مطالب</div>
        <div className="pt-3"><TocLinks guide={guide} /></div>
      </aside>
    </div>
  );
}

export function GuideNextSteps({ guide }: { guide: BuyingGuide }) {
  return (
    <section aria-labelledby="guide-next-steps" className="mt-6 grid gap-4 rounded-3xl bg-gradient-to-l from-[#062b6d] to-[#0b58c8] p-5 text-white shadow-[0_20px_55px_rgba(7,57,137,0.22)] sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <p className="text-sm font-black text-blue-200">راهنماهای مرتبط و مشاوره خرید</p>
        <h2 id="guide-next-steps" className="mt-2 text-2xl font-black sm:text-3xl">انتخاب نهایی را با موجودی واقعی تطبیق دهید</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">مدل‌های منتشرشده فروشگاه را ببینید یا برای پرسش درباره مدل، لوازم ضروری و خرید دستگاه کارکرده با کرمان آتاری تماس بگیرید.</p>
        {guide.relatedGuides.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {guide.relatedGuides.map((relatedGuide) => (
              <Link key={relatedGuide.href} href={relatedGuide.href} className="group inline-flex min-h-11 items-center rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm text-blue-50 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white">
                <strong className="font-black text-white">{relatedGuide.title}</strong>
                <span className="mr-2 text-xs text-blue-200">{relatedGuide.description}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
        <Link href={guide.productHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-blue-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-800">{guide.productsCtaLabel} <ArrowLeft className="h-4 w-4" /></Link>
        <Link href="/contact-us" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 text-sm font-black text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white">مشاوره خرید <WalletCards className="h-4 w-4" /></Link>
      </div>
    </section>
  );
}
