/**
 * Admin documentation browser — the "Doc" tile on the command center.
 *
 * Renders the Markdown files bundled under `src/docs/`. Content is authored as
 * files rather than stored in Firestore on purpose: the docs describe how the
 * app behaves at a given version, so they should ship and be reviewed with the
 * code that they document.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Separator } from "../../components/ui/separator";
import { ArrowLeft, BookText, FileText, Printer, Search } from "lucide-react";
import { AdminDocMarkdown } from "../../components/admin/AdminDocMarkdown";
import {
  getAdminDocByPath,
  getAdminDocCategories,
  getAdminDocHeadings,
  searchAdminDocs,
  type AdminDoc,
} from "../../lib/adminDocs";

function DocListItem({ doc, active }: { doc: AdminDoc; active: boolean }) {
  return (
    <Link to={`/admin/docs/${doc.path}`} className="block">
      <Button
        variant={active ? "secondary" : "ghost"}
        size="sm"
        className="h-auto min-h-9 w-full justify-start py-1.5 text-left font-normal"
      >
        <span className="truncate">{doc.title}</span>
      </Button>
    </Link>
  );
}

function DocsSidebar({ activePath }: { activePath?: string }) {
  const categories = getAdminDocCategories();

  return (
    <nav className="space-y-5">
      {categories.map((category) => (
        <div key={category.id}>
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {category.label}
          </p>
          <div className="space-y-0.5">
            {category.docs.map((doc) => (
              <DocListItem key={doc.path} doc={doc} active={doc.path === activePath} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function DocsIndex() {
  const [query, setQuery] = useState("");
  const categories = getAdminDocCategories();
  const results = useMemo(
    () => (query.trim() ? searchAdminDocs(query) : null),
    [query],
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <BookText className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wide">
            Documentation
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">
          Platform docs &amp; troubleshooting
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          How the MORTAR web app and the digital curriculum work, how to run
          them, and what to do when something goes wrong. Written for staff and
          admins &mdash; the troubleshooting guides are organised by the symptom
          a user reports.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search all docs (e.g. &quot;permission denied&quot;, &quot;quiz&quot;, &quot;invite code&quot;)"
          className="pl-9"
        />
      </div>

      {results ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {results.length === 0
              ? "No docs match that search."
              : `${results.length} doc${results.length === 1 ? "" : "s"} match.`}
          </p>
          {results.map((doc) => (
            <Link key={doc.path} to={`/admin/docs/${doc.path}`} className="block">
              <Card className="cursor-pointer p-4 transition-all hover:border-accent hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <h3 className="font-medium text-foreground">{doc.title}</h3>
                    {doc.summary && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {doc.summary}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category.id} className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {category.label}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {category.docs.map((doc) => (
                  <Link key={doc.path} to={`/admin/docs/${doc.path}`} className="block">
                    <Card className="h-full cursor-pointer p-4 transition-all hover:border-accent hover:shadow-lg">
                      <div className="flex items-start gap-3">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <div className="min-w-0">
                          <h3 className="font-medium text-foreground">
                            {doc.title}
                          </h3>
                          {doc.summary && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {doc.summary}
                            </p>
                          )}
                          {doc.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {doc.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="border-border text-[10px]"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocView({ doc }: { doc: AdminDoc }) {
  const headings = useMemo(() => getAdminDocHeadings(doc.body), [doc.body]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/docs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All docs
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="ml-auto"
        >
          <Printer className="mr-2 h-4 w-4" />
          Print / save PDF
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-semibold text-foreground">{doc.title}</h1>
        {doc.summary && (
          <p className="mt-2 max-w-2xl text-muted-foreground">{doc.summary}</p>
        )}
      </div>

      {headings.length > 2 && (
        <Card className="p-4 print:hidden">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            On this page
          </p>
          <ul className="space-y-1">
            {headings.map((heading) => (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  className="text-sm text-muted-foreground underline-offset-2 hover:text-accent hover:underline"
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Separator />

      <AdminDocMarkdown body={doc.body} />
    </div>
  );
}

export function AdminDocs() {
  const { categoryId, slug } = useParams();
  const navigate = useNavigate();
  const docPath = categoryId && slug ? `${categoryId}/${slug}` : undefined;
  const doc = getAdminDocByPath(docPath);

  return (
    <div className="flex w-full">
      <aside className="hidden w-[min(16rem,90vw)] shrink-0 border-r border-border px-2 py-6 lg:block print:hidden">
        <div className="sticky top-24">
          <DocsSidebar activePath={doc?.path} />
        </div>
      </aside>

      <div className="min-w-0 flex-1 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-3xl">
          {docPath && !doc ? (
            <Card className="space-y-3 p-6">
              <h1 className="text-lg font-semibold text-foreground">
                Document not found
              </h1>
              <p className="text-sm text-muted-foreground">
                There is no doc at <code className="text-foreground">{docPath}</code>.
                It may have been renamed.
              </p>
              <Button size="sm" onClick={() => navigate("/admin/docs")}>
                Back to all docs
              </Button>
            </Card>
          ) : doc ? (
            <DocView doc={doc} />
          ) : (
            <DocsIndex />
          )}
        </div>
      </div>
    </div>
  );
}
