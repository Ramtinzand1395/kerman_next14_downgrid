"use client"
import Categories from "./Categories";
import Motion from "./Motion";

interface BoxContainerProps {
  title: string;
  subtitle?: React.ReactNode; // چون subtitle ممکنه JSX باشه
}

export default function BoxContainer({ title, subtitle }: BoxContainerProps) {
  return (
    <div className="p-5">
      <Motion delay={0.25}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg lg:text-2xl whitespace-nowrap my-5 flex items-center">
            <div className="bg-[#0D1023] w-5 h-10 rounded-md ml-3" />
            {title}
          </h2>
        </div>
      </Motion>

      <Motion delay={0.5}>
        <div className="flex items-center justify-between">{subtitle}</div>
      </Motion>

      <Categories />
    </div>
  );
}
