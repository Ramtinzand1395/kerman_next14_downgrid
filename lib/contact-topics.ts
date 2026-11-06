const contactSubjects = {
  "buying-advice": "مشاوره خرید بازی و کنسول",
  "used-console": "درخواست ارزیابی کنسول کارکرده",
  "after-sales": "پشتیبانی پس از خرید",
  "service-advice": "مشاوره خدمات",
} as const;

export function contactTopicHref(topic: keyof typeof contactSubjects) {
  return `/contact-us?topic=${topic}#contact-form`;
}

export function contactTopicSubject(topic: string | string[] | undefined) {
  return typeof topic === "string" && Object.hasOwn(contactSubjects, topic)
    ? contactSubjects[topic as keyof typeof contactSubjects]
    : "";
}
