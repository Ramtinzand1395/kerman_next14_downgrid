// import { BlogPost } from "@/types";
// import Image from "next/image";
// import { notFound } from "next/navigation";

// type Params = Promise<{ slug: string }>;

// async function getBlog(slug: string): Promise<BlogPost | null> {
//   try {
//     const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
//     const res = await fetch(`${baseUrl}/api/blog/${slug}`, { cache: "no-store" });

//     if (res.status === 404) return null;
//     if (!res.ok) return null;

//     return res.json();
//   } catch {
//     return null;
//   }
// }

// export default async function BlogDetailPage({ params }: { params: Params }) {
//   const { slug } = await params;
//   const blog = await getBlog(slug);

//   if (!blog) {
//     notFound();
//   }

//   return (
//     <article className="mx-auto max-w-4xl px-4 py-8 md:py-12">
//       <h1 className="text-2xl font-black text-slate-900 md:text-4xl">{blog.title}</h1>
//       <p className="mt-2 text-sm text-slate-500">
//         {new Date(blog.createdAt).toLocaleDateString("fa-IR")}
//       </p>

//       {blog.coverImage ? (
//         <div className="relative mt-6 h-72 w-full overflow-hidden rounded-2xl md:h-96">
//           <Image src={blog.coverImage} alt={blog.title} fill className="object-cover" />
//         </div>
//       ) : null}

//       <p className="mt-8 whitespace-pre-line leading-8 text-slate-700">{blog.content}</p>
//     </article>
//   );
// }

import { BlogPost } from "@/types";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

type Params = Promise<{ slug: string }>;

async function getBlog(slug: string): Promise<BlogPost | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/blog/${slug}`, { cache: "no-store" });

    if (res.status === 404) return null;
    if (!res.ok) return null;

    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlog(slug);

  if (!blog) {
    return {
      title: "مقاله یافت نشد",
      description: "این مقاله در حال حاضر در دسترس نیست.",
    };
  }

  const title = blog.title;
  const description = blog.metaDescription || blog.excerpt || "مطالعه مقاله در کرمان آتاری";
  const keywords = [...(blog.focusKeyword || []), "وبلاگ", "کرمان آتاری"].filter(
    Boolean,
  ) as string[];

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      type: "article",
      images: blog.coverImage ? [blog.coverImage] : [],
    },
  };
}

export default async function BlogDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const blog = await getBlog(slug);

  if (!blog) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <h1 className="text-2xl font-black text-slate-900 md:text-4xl">{blog.title}</h1>
      <p className="mt-2 text-sm text-slate-500">
        {new Date(blog.createdAt).toLocaleDateString("fa-IR")}
      </p>

      {blog.coverImage ? (
        <div className="relative mt-6 h-72 w-full overflow-hidden rounded-2xl md:h-96">
          <Image src={blog.coverImage} alt={blog.title} fill className="object-cover" />
        </div>
      ) : null}

      <p className="mt-8 whitespace-pre-line leading-8 text-slate-700">{blog.content}</p>

      {blog.focusKeyword?.length ? (
        <div className="mt-8 flex flex-wrap gap-2">
          {blog.focusKeyword.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700"
            >
              {keyword}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
