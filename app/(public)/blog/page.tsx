import { BlogPost } from "@/types";
import Image from "next/image";
import Link from "next/link";

async function getBlogs(): Promise<BlogPost[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/blog?limit=30`, { cache: "no-store" });

    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const blogs = await getBlogs();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <h1 className="text-2xl font-black text-slate-900 md:text-3xl">وبلاگ</h1>
      <p className="mt-2 text-sm text-slate-600">جدیدترین مطالب آموزشی و راهنمای خرید</p>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {blogs.map((post) => (
          <article key={post._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="relative h-48 w-full bg-slate-100">
              {post.coverImage ? (
                <Image src={post.coverImage} alt={post.title} fill className="object-cover" />
              ) : null}
            </div>
            <div className="p-4">
              <h2 className="line-clamp-2 text-lg font-bold text-slate-900">{post.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-slate-600">{post.excerpt || post.content}</p>
              <Link href={`/blog/${post.slug}`} className="mt-4 inline-flex text-sm font-bold text-indigo-700">
                مطالعه مقاله
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
