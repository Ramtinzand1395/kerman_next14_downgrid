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
import { SITE_URL } from "@/lib/site";
import { sanitizeBlogContent, stripBlogHtml } from "@/lib/blogSeo";

type Params = Promise<{ slug: string }>;

async function getBlog(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${SITE_URL}/api/blog/${slug}`, { cache: "no-store" });

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

  const title = blog.seoTitle || blog.title;
  const description =
    stripBlogHtml(blog.metaDescription) ||
    stripBlogHtml(blog.excerpt) ||
    stripBlogHtml(blog.content).slice(0, 160) ||
    "مطالعه مقاله در کرمان آتاری";

  const keywords = [
    ...(blog.focusKeyword || []),
    ...(blog.tags || []),
    blog.category,
    "وبلاگ",
    "کرمان آتاری",
  ].filter(Boolean) as string[];

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: `/blog/${blog.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/blog/${blog.slug}`,
      locale: "fa_IR",
      publishedTime: blog.publishedAt || blog.createdAt,
      modifiedTime: blog.updatedAt,
      tags: blog.tags,
      images: blog.coverImage
        ? [
            {
              url: blog.coverImage,
              alt: blog.coverImageAlt || blog.title,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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

  const publishedDate = blog.publishedAt || blog.createdAt;
  const safeContent = sanitizeBlogContent(blog.content);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: blog.title,
    description:
      stripBlogHtml(blog.metaDescription) || stripBlogHtml(blog.excerpt),
    image: blog.coverImage ? [blog.coverImage] : undefined,
    datePublished: publishedDate,
    dateModified: blog.updatedAt,
    mainEntityOfPage: `${SITE_URL}/blog/${blog.slug}`,
    author: {
      "@type": "Organization",
      name: "کرمان آتاری",
    },
    publisher: {
      "@type": "Organization",
      name: "کرمان آتاری",
    },
    keywords: [...(blog.focusKeyword || []), ...(blog.tags || [])].join(", "),
    articleSection: blog.category || undefined,
  };

  return (
    <article className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {blog.category ? (
        <p className="mb-3 text-sm font-bold text-indigo-700">{blog.category}</p>
      ) : null}
      <h1 className="text-2xl font-black text-slate-900 md:text-4xl">
        {blog.title}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        انتشار {new Date(publishedDate).toLocaleDateString("fa-IR")}
        {blog.updatedAt !== blog.createdAt ? (
          <> · آخرین به‌روزرسانی {new Date(blog.updatedAt).toLocaleDateString("fa-IR")}</>
        ) : null}
      </p>

      {blog.excerpt ? (
        <p className="mt-6 border-r-4 border-indigo-500 pr-4 text-lg leading-8 text-slate-700">
          {blog.excerpt}
        </p>
      ) : null}

      {blog.coverImage ? (
        <div className="relative mt-6 h-72 w-full overflow-hidden rounded-2xl md:h-96">
          <Image
            src={blog.coverImage}
            alt={blog.coverImageAlt || blog.title}
            fill
            priority
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
          />
        </div>
      ) : null}

      <div
        className="prose prose-slate mt-8 max-w-none leading-8"
        dangerouslySetInnerHTML={{ __html: safeContent }}
      />

      {blog.tags?.length ? (
        <div className="mt-8 flex flex-wrap gap-2">
          {blog.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
