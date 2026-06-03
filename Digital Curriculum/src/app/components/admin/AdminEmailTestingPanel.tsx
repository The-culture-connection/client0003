import { useCallback, useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Loader2, Mail, Send, FlaskConical } from "lucide-react";
import { FirebaseError } from "firebase/app";
import {
  listTestEmailTemplates,
  sendTestTransactionalEmail,
  type TestEmailTemplateInfo,
} from "../../lib/adminEmailTesting";
import {
  BREVO_TEST_EMAIL_SECTION_LABELS,
  type BrevoTestEmailSection,
} from "../../lib/brevoTestEmailCatalog";

export function AdminEmailTestingPanel() {
  const [testEmail, setTestEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [templates, setTemplates] = useState<TestEmailTemplateInfo[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [lastParams, setLastParams] = useState<Record<string, unknown> | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const list = await listTestEmailTemplates();
      setTemplates(list);
    } catch (e: unknown) {
      const msg =
        e instanceof FirebaseError ? `${e.code}: ${e.message}` : (e as Error)?.message ?? String(e);
      setResult(`Failed to load templates: ${msg}`);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSend = async (templateKey: string) => {
    const email = testEmail.trim();
    if (!email || !email.includes("@")) {
      setResult("Enter a valid recipient email address.");
      return;
    }

    setSendingKey(templateKey);
    setResult(null);
    setLastParams(null);

    try {
      const out = await sendTestTransactionalEmail({
        to: email,
        templateKey,
        firstName: firstName.trim() || undefined,
      });
      setLastParams(out.params);
      const label = templates.find((t) => t.key === templateKey)?.label ?? templateKey;
      setResult(
        `Sent "${label}" to ${out.to}` +
          (out.messageId ? ` (messageId: ${out.messageId})` : "") +
          ". Check inbox and Firestore email_activity."
      );
    } catch (e: unknown) {
      if (e instanceof FirebaseError) {
        setResult(`${e.code}: ${e.message}`);
      } else {
        setResult((e as Error)?.message ?? String(e));
      }
    } finally {
      setSendingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <FlaskConical className="w-6 h-6 text-accent shrink-0 mt-0.5" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Email testing</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Send sample Brevo transactional emails to any inbox. Uses server-built test params;
              preference opt-outs are bypassed for these admin test sends. Production flows are
              unchanged.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Recipient email</Label>
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-first-name">First name (optional)</Label>
            <Input
              id="test-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jordan"
              className="bg-background"
            />
          </div>
        </div>

        {result && (
          <div
            className={`text-sm rounded-md border p-3 ${
              result.startsWith("Sent ")
                ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {result}
          </div>
        )}

        {lastParams && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Last Brevo params sent
            </summary>
            <pre className="mt-2 p-3 rounded-md bg-muted overflow-auto max-h-48 text-foreground">
              {JSON.stringify(lastParams, null, 2)}
            </pre>
          </details>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold text-foreground">Transactional templates</h3>
        </div>

        {loadingTemplates ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading templates…
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No templates configured.</p>
        ) : (
          <div className="space-y-8">
            {templates.some((t) => t.fromCatalogOnly) && (
              <p className="text-sm text-amber-700 dark:text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-md p-3">
                Some templates (including payment emails) are not on the deployed Functions build yet.
                Deploy{" "}
                <code className="text-xs bg-muted px-1 rounded">adminListTestEmailTemplates</code> and{" "}
                <code className="text-xs bg-muted px-1 rounded">adminSendTestTransactionalEmail</code>{" "}
                to enable Send test for those rows.
              </p>
            )}
            {(
              ["course", "graduation", "events", "payments"] as BrevoTestEmailSection[]
            ).map((section) => {
              const sectionTemplates = templates.filter((t) => t.section === section);
              if (sectionTemplates.length === 0) return null;
              return (
                <div key={section}>
                  <h4 className="text-sm font-semibold text-foreground mb-3">
                    {BREVO_TEST_EMAIL_SECTION_LABELS[section]}
                  </h4>
                  <div className="space-y-3">
                    {sectionTemplates.map((tpl) => (
                      <div
                        key={tpl.key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{tpl.label}</p>
                          <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                            {tpl.key}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              Brevo ID {tpl.template_id}
                            </Badge>
                            {tpl.fromCatalogOnly && (
                              <Badge variant="outline" className="text-xs border-amber-500/50">
                                deploy required
                              </Badge>
                            )}
                            {tpl.preference_category && (
                              <Badge variant="outline" className="text-xs">
                                {tpl.preference_category}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={sendingKey !== null || tpl.fromCatalogOnly}
                          onClick={() => handleSend(tpl.key)}
                          className="shrink-0 bg-accent hover:bg-accent/90 text-accent-foreground"
                        >
                          {sendingKey === tpl.key ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Sending…
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send test
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
