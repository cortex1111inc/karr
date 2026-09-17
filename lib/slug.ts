export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Appends a short random suffix so two orgs with the same name don't
// collide on the `organizations.slug` unique index.
export function uniqueSlug(input: string): string {
  const base = slugify(input) || "org";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
