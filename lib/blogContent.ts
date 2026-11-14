import sanitizeHtml from "sanitize-html";

export const sanitizeBlogContent = (value = "") =>
  sanitizeHtml(value, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "s", "u", "bdi"],
    allowedAttributes: {
      "*": ["dir", "lang"],
      a: ["href", "rel", "target", "title"],
      img: ["src", "alt", "width", "height", "title"],
    },
    allowedClasses: {
      "*": [/^ql-(align-(center|right|justify)|direction-rtl|indent-[1-8]|syntax)$/],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
    },
    parser: { lowerCaseAttributeNames: true },
    parseStyleAttributes: false,
    transformTags: {
      a: (tagName, attributes) => ({
        tagName,
        attribs: attributes.target === "_blank"
          ? { ...attributes, rel: "noopener noreferrer" }
          : attributes,
      }),
    },
  }).trim();
