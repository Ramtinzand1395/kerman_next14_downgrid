import type { BuyingGuide, GuideBlock } from "./types";

function blockText(block: GuideBlock): string[] {
  switch (block.type) {
    case "paragraph": return [block.text];
    case "subheading": return [block.title];
    case "list": return block.items;
    case "callout": return [block.title, block.text];
    case "inspection":
      return [block.intro, block.note, ...block.groups.flatMap((group) => [group.title, ...group.items])];
    case "figure": return [block.image.alt, block.image.caption];
    case "table":
      return [block.table.caption, ...block.table.columns, ...block.table.rows.flatMap((row) => [row.label, ...row.cells])];
  }
}

export function getGuideReadingMinutes(guide: BuyingGuide): number {
  const text = [guide.title, guide.intro, ...guide.quickChoices.flatMap((choice) => [choice.title, choice.answer]), ...guide.sections.flatMap((section) => [section.title, ...section.blocks.flatMap(blockText)]), ...guide.faqs.flatMap((faq) => [faq.question, faq.answer])].join(" ");
  const words = text.trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}
