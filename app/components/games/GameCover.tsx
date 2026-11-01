"use client";

import Image from "next/image";
import { useState } from "react";
import { Gamepad2 } from "lucide-react";

export default function GameCover({ game, className = "h-12 w-12", sizes = "80px" }: {
  game: { name: string; imageUrl?: string; imageAlt?: string };
  className?: string;
  sizes?: string;
}) {
  const [failedUrl, setFailedUrl] = useState("");
  const source = game.imageUrl || "";
  const valid = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(source);
  return <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 ${className}`}>
    {valid && failedUrl !== source ? <Image src={source} alt={game.imageAlt || `کاور بازی ${game.name}`} fill sizes={sizes} className="object-contain" onError={() => setFailedUrl(source)} /> : <Gamepad2 aria-label="کاور موجود نیست" className="h-6 w-6 text-slate-400" />}
  </span>;
}
