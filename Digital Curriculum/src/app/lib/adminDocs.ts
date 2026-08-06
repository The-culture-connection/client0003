/**
 * Registry for the admin Doc tile (`/admin/docs`).
 *
 * Docs are plain Markdown files under `src/docs/<category>/<slug>.md`, bundled
 * into the app at build time. To add a doc, drop a `.md` file in one of those
 * folders with the frontmatter block below — nothing here needs editing.
 *
 *   ---
 *   title: Signing in and account access
 *   summary: One line shown on the docs index card.
 *   order: 20
 *   tags: login, roles, invites
 *   ---
 *
 * `title` is required; everything else is optional. The category comes from the
 * folder name and the slug from the filename, so file layout is the only
 * source of truth for URLs.
 */

export type AdminDocCategoryId = "webapp" | "curriculum" | "operations";

export type AdminDoc = {
  /** URL segment, from the filename: `troubleshooting.md` -> `troubleshooting`. */
  slug: string;
  /** Unique across categories, used as the route param: `webapp/troubleshooting`. */
  path: string;
  categoryId: AdminDocCategoryId;
  title: string;
  summary: string;
  tags: string[];
  order: number;
  /** Markdown body with the frontmatter block stripped. */
  body: string;
  /** Lowercased title + summary + tags + body, precomputed for search. */
  searchText: string;
};

export type AdminDocCategory = {
  id: AdminDocCategoryId;
  label: string;
  description: string;
  docs: AdminDoc[];
};

const CATEGORY_META: Record<
  AdminDocCategoryId,
  { label: string; description: string; order: number }
> = {
  webapp: {
    label: "Web app",
    description:
      "Running the MORTAR web platform day to day — accounts, roles, community, commerce.",
    order: 10,
  },
  curriculum: {
    label: "Digital curriculum",
    description:
      "Authoring courses and lesson decks, and how learner progress is tracked.",
    order: 20,
  },
  operations: {
    label: "Operations",
    description:
      "Environments, deploys, and the backend services the platform depends on.",
    order: 30,
  },
};

function isCategoryId(value: string): value is AdminDocCategoryId {
  return value in CATEGORY_META;
}

/**
 * Minimal frontmatter reader. We only ever emit flat `key: value` pairs, so a
 * real YAML parser would be a dependency for no gain — but keep this tolerant,
 * because the whole point of the folder is that non-engineers edit it.
 */
function parseFrontmatter(raw: string): {
  meta: Record<string, string>;
  body: string;
} {
  const normalized = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(normalized);
  if (!match) return { meta: {}, body: normalized.trim() };

  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    if (!key || key.startsWith("#")) continue;
    meta[key] = line
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }

  return { meta, body: normalized.slice(match[0].length).trim() };
}

function titleFromSlug(slug: string): string {
  const words = slug.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const rawDocs = import.meta.glob<string>("../../docs/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

function buildDocs(): AdminDoc[] {
  const docs: AdminDoc[] = [];

  for (const [filePath, raw] of Object.entries(rawDocs)) {
    // "../../docs/webapp/troubleshooting.md" -> ["webapp", "troubleshooting"]
    const relative = filePath.split("/docs/")[1];
    if (!relative) continue;
    const segments = relative.replace(/\.md$/i, "").split("/");
    if (segments.length !== 2) continue;

    const [categoryId, slug] = segments;
    if (!isCategoryId(categoryId)) continue;

    const { meta, body } = parseFrontmatter(raw);
    const title = meta.title || titleFromSlug(slug);
    const summary = meta.summary || "";
    const tags = (meta.tags || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const parsedOrder = Number.parseInt(meta.order ?? "", 10);

    docs.push({
      slug,
      path: `${categoryId}/${slug}`,
      categoryId,
      title,
      summary,
      tags,
      order: Number.isFinite(parsedOrder) ? parsedOrder : 999,
      body,
      searchText: [title, summary, tags.join(" "), body].join("\n").toLowerCase(),
    });
  }

  return docs.sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title),
  );
}

const ALL_DOCS = buildDocs();

export function getAllAdminDocs(): AdminDoc[] {
  return ALL_DOCS;
}

export function getAdminDocCategories(): AdminDocCategory[] {
  return (Object.keys(CATEGORY_META) as AdminDocCategoryId[])
    .map((id) => ({
      id,
      label: CATEGORY_META[id].label,
      description: CATEGORY_META[id].description,
      docs: ALL_DOCS.filter((doc) => doc.categoryId === id),
    }))
    .filter((category) => category.docs.length > 0)
    .sort((a, b) => CATEGORY_META[a.id].order - CATEGORY_META[b.id].order);
}

export function getAdminDocByPath(path: string | undefined): AdminDoc | undefined {
  if (!path) return undefined;
  return ALL_DOCS.find((doc) => doc.path === path);
}

export function searchAdminDocs(query: string): AdminDoc[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return ALL_DOCS;
  return ALL_DOCS.filter((doc) =>
    terms.every((term) => doc.searchText.includes(term)),
  );
}

/**
 * Pulls the `## ` headings out of a doc body so the viewer can show a table of
 * contents. Fenced code blocks are skipped — `# comments` inside a shell
 * snippet are not headings.
 */
export function getAdminDocHeadings(
  body: string,
): { id: string; text: string }[] {
  const headings: { id: string; text: string }[] = [];
  let inFence = false;

  for (const line of body.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) headings.push({ id: slugifyHeading(match[1]), text: match[1] });
  }

  return headings;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
