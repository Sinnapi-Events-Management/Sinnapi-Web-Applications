// PostgREST embeds a to-one relation as an object, but the JS types sometimes
// widen it to an array. Normalize to a single record.
export function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
