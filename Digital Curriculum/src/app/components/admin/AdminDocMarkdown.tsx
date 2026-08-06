/**
 * Markdown renderer for the admin Doc tile.
 *
 * The component map exists so docs inherit the same typography scale as the
 * hand-written content pages (see pages/ChildSafety.tsx) instead of browser
 * defaults — Tailwind's preflight strips heading and list styling, so unstyled
 * Markdown renders as an undifferentiated wall of text.
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugifyHeading } from "../../lib/adminDocs";

function headingId(children: React.ReactNode): string | undefined {
  const text = extractText(children);
  return text ? slugifyHeading(text) : undefined;
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: React.ReactNode } }).props.children);
  }
  return "";
}

export function AdminDocMarkdown({ body }: { body: string }) {
  return (
    <div className="space-y-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-8 text-2xl font-semibold text-foreground first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              id={headingId(children)}
              className="mt-10 scroll-mt-24 border-b border-border pb-2 text-xl font-semibold text-foreground first:mt-0"
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 text-base font-semibold text-foreground">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-4 text-sm font-semibold text-foreground">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => {
            const external = /^https?:/i.test(href ?? "");
            return (
              <a
                href={href}
                className="text-accent underline underline-offset-2 hover:no-underline"
                {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {children}
              </a>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent/60 bg-accent/5 py-2 pl-4 pr-3 text-sm text-muted-foreground [&>p]:m-0">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-border" />,
          code: ({ className, children }) => {
            // react-markdown gives fenced blocks a `language-*` class and
            // inline code none, which is how we tell the two apart.
            const isBlock = Boolean(className);
            if (isBlock) {
              return (
                <code className="block whitespace-pre text-xs leading-relaxed text-foreground">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem] text-foreground">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/40 text-foreground">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border px-3 py-2 align-top text-muted-foreground last:border-b-0">
              {children}
            </td>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
