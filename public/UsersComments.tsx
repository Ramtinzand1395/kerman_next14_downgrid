import { stripHtmlTags } from "@/helpers/stripHtmlTags";
import Image from "next/image";
import Link from "next/link";
import { getPublishedBlogs } from "@/services/blog/getPublishedBlogs";

export default async function UsersComments() {
  const blogs = await getPublishedBlogs(3);

  if (!blogs.length) return null;

  return (
    <section className="mt-8 rounded-3xl border border-blue-100 bg-blue-50 p-6 md:p-8">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-900 md:text-2xl">
          جدیدترین مطالب وبلاگ
        </h2>

        <Link
          href="/blog"
          className="text-sm font-bold text-indigo-700 hover:text-indigo-900"
        >
          مشاهده همه
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {blogs.map((post) => (
          <article
            key={post._id}
            className="overflow-hidden rounded-2xl bg-white shadow-sm"
          >
            <div className="relative h-44 w-full bg-slate-100">
              {post.coverImage ? (
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  className="object-contain"
                />
              ) : (
                <Image
                  src="/atari-seeklogo.svg"
                  alt={post.title}
                  fill
                  className="object-contain"
                />
              )}
            </div>

            <div className="p-5">
              <h3 className="text-base font-bold text-slate-900">
                {post.title}
              </h3>

              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
            {stripHtmlTags(post.metaDescription || post.excerpt || post.content)}
              </p>

              <Link
                href={`/blog/${post.slug}`}
                className="mt-4 inline-flex text-sm font-bold text-indigo-700 hover:text-indigo-900"
              >
                مطالعه مقاله
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
