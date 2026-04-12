/**
 * Slugifie un texte pour l'utiliser comme nom de channel Discord.
 * Lowercase, pas d'espaces (remplacés par -), pas de caractères spéciaux.
 * Max 100 caractères.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 90);
}

/**
 * Extrait le nom d'un emoji custom Discord <:name:id> ou retourne l'emoji brut.
 */
export function extractEmojiName(emoji: string | null): string {
  if (!emoji) return "";
  const match = emoji.match(/<:(\w+):\d+>/);
  return match ? match[1] : emoji;
}
