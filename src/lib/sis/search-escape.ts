// Escapes the LIKE/ILIKE wildcard characters so that text typed into the
// search box is matched literally ("50%" must not match every row, and "_"
// must not match any single character). The backslash is PostgreSQL's default
// LIKE escape character, so it is escaped first.
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
