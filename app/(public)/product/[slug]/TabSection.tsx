"use client";
import { useState } from "react";
import { FileText, MessageSquare, TagIcon } from "lucide-react";
import { Specifications } from "./Specifications";
import { CommentsList } from "./CommentsList";
import { Product } from "@/types";
interface TabSectionProps {
  product: Product;
}

const TabSection = ({ product }: TabSectionProps) => {
  const [activeTab, setActiveTab] = useState<"desc" | "specs" | "comments">(
    "desc"
  );

  return (
    <div className="lg:col-span-9 space-y-8">
      {/* Tabs Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex overflow-x-auto">
        <button
          onClick={() => setActiveTab("desc")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === "desc"
              ? "bg-red-50 text-red-600"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <FileText className="w-4 h-4" />
          نقد و بررسی
        </button>
        <button
          onClick={() => setActiveTab("specs")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === "specs"
              ? "bg-indigo-50 text-indigo-600"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <TagIcon className="w-4 h-4" />
          مشخصات فنی
        </button>
        <button
          onClick={() => setActiveTab("comments")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === "comments"
              ? "bg-yellow-50 text-yellow-600"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          دیدگاه کاربران
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-10 min-h-[400px]">
        {activeTab === "desc" && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              نقد و بررسی تخصصی
            </h2>
            <div className="prose prose-slate max-w-none prose-img:rounded-2xl prose-headings:font-bold prose-a:text-indigo-600">
              {product.description}
            </div>
          </div>
        )}

        {activeTab === "specs" && (
          <div className="animate-fade-in">
            <Specifications specs={product.specifications} />
          </div>
        )}

        {activeTab === "comments" && (
          <div className="animate-fade-in">
            <CommentsList comments={product.comments} productId={product.id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TabSection;
