"use client"
import Categories from "./Categories";
import Motion from "./Motion";

interface BoxContainerProps {
  title: string;
  subtitle?: React.ReactNode; // چون subtitle ممکنه JSX باشه
}

export default function BoxContainer({ title, subtitle }: BoxContainerProps) {
  return (
     <section className="mt-10 rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 md:p-8">

      <Motion delay={0.25}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg lg:text-2xl whitespace-nowrap my-5 flex items-center">
            <div className="bg-[#001A6E] w-3 h-10 rounded-md ml-3" />
            {title}
          </h2>
        </div>
      </Motion>

      <Motion delay={0.5}>
        <div className="flex items-center justify-between">{subtitle}</div>
      </Motion>

      <Categories />
   </section>

  );
}
