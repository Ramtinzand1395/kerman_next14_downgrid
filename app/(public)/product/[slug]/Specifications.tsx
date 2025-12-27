import { Specification } from "@/types";

interface SpecificationsProps {
  specs: Specification[];
}

export const Specifications = ({ specs }: SpecificationsProps) => {
  return (
    <div className="space-y-8">
      <h3 className="text-xl font-bold text-gray-800 mb-6 border-r-4 border-red-500 pr-3">
        مشخصات فنی
      </h3>

      {specs.map((spec) => (
        <div
          key={spec.id}
          className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm"
        >
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              {spec.title}
            </h4>
          </div>
          <div className="divide-y divide-gray-50">
            {spec.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-1 md:grid-cols-4 px-6 py-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="text-gray-500 text-sm font-medium md:col-span-1 mb-1 md:mb-0">
                  {item.key}
                </div>
                <div className="text-gray-800 text-sm md:col-span-3 leading-relaxed font-medium">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
