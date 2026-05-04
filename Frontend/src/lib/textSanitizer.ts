const UNSUPPORTED_TEXT_CHARS_REGEX = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u200B-\u200F\u2060\u2066-\u2069\u200D\uFE0F]/gu;

const TEXT_INPUT_TYPES = new Set(["text", "search", "email", "tel", "url"]);

export const sanitizeTextInputValue = (value?: string) => (value || "").replace(UNSUPPORTED_TEXT_CHARS_REGEX, "");

export const shouldSanitizeInputType = (type?: string) => {
  if (!type) return true;
  return TEXT_INPUT_TYPES.has(type);
};
