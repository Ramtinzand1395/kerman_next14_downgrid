export type GuideImage = {
  src: string;
  alt: string;
  caption: string;
  aspect: "4/3" | "16/9" | "3/1";
  objectPosition?: string;
};

export type GuideTable = {
  caption: string;
  columns: string[];
  rows: Array<{
    label: string;
    cells: string[];
  }>;
};

export type GuideBlock =
  | { type: "paragraph"; text: string }
  | { type: "subheading"; title: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "callout"; title: string; text: string }
  | { type: "figure"; image: GuideImage }
  | { type: "table"; table: GuideTable };

export type GuideSection = {
  id: string;
  title: string;
  blocks: GuideBlock[];
};

export type GuideFaqItem = {
  question: string;
  answer: string;
};

export type GuideSource = {
  label: string;
  href: string;
  note: string;
};

export type BuyingGuide = {
  slug: string;
  label: string;
  title: string;
  seoTitle: string;
  description: string;
  intro: string;
  publishedAt: string;
  modifiedAt: string;
  publishedLabel: string;
  heroImage: GuideImage;
  productHref: string;
  quickChoices: Array<{
    title: string;
    answer: string;
  }>;
  sections: GuideSection[];
  faqs: GuideFaqItem[];
  sources: GuideSource[];
};
