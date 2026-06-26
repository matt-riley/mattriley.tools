const MAX_TITLE_HEADROOM = 46; // Layout appends " | mattriley.tools" (19 chars); total ≤ 65

export function formatSeoTitle(name: string, domain: string): string {
  const suffix = ` ${domain}`;
  const maxNameLength = Math.max(0, MAX_TITLE_HEADROOM - suffix.length);
  const trimmedName = name.length > maxNameLength ? name.slice(0, maxNameLength) : name;

  return `${trimmedName}${suffix}`;
}

export function formatSeoDescription(raw: string | null | undefined, tagline: string): string {
  const description = raw?.trim() ?? "";

  if (description.length === 0) {
    return tagline;
  }

  if (description.length > 200) {
    return `${description.slice(0, 197)}...`;
  }

  const combined = `${description} ${tagline}`;

  if (combined.length > 200) {
    return `${description.slice(0, 197)}...`;
  }

  if (combined.length < 70) {
    return `${combined} — from mattriley.tools`;
  }

  return combined;
}
