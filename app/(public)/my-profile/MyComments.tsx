"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

interface Comment {
  id: number;
  text: string;
  rating: number;
  verified: boolean;
  createdAt: string;
  product: {
    title: string;
    mainImage: string;
  };
}

export default function MyComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/users_data/comments`);
        const data = await res.json();
        setComments(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="p-4 border rounded flex items-center space-x-4"
          >
            <Skeleton width={50} height={50} />
            <div className="flex-1 space-y-2">
              <Skeleton width={100} height={20} />
              <Skeleton width={`80%`} height={15} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!comments.length) {
    return <p>هیچ کامنتی موجود نیست.</p>;
  }

  return (
    <div className="space-y-4 mt-5">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="p-4 border rounded flex items-center space-x-4 bg-white"
        >
          <Image
            width={50}
            height={50}
            src={comment.product.mainImage}
            alt={comment.product.title}
            className="w-16 h-16 object-cover rounded"
          />
          <div className="flex-1">
            <p className="font-semibold">{comment.product.title}</p>
            <p className="text-gray-600">{comment.text}</p>
            <p
              className={`text-sm ${
                comment.verified ? "text-green-600" : "text-red-500"
              }`}
            >
              {comment.verified ? "تایید شده" : "تایید نشده"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
