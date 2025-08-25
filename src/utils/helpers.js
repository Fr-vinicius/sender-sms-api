import { randomInt } from "crypto";

const CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateSlug(length = 7) {
  let s = "";
  for (let i = 0; i < length; i++) {
    s += CHARS.charAt(randomInt(CHARS.length));
  }
  return s;
}

export function buildMessage(template = "", shortUrl = "") {
  if (!shortUrl) return template;
  return template.includes("{link}")
    ? template.replaceAll("{link}", shortUrl) // ou regex global
    : `${template} ${shortUrl}`;
}
