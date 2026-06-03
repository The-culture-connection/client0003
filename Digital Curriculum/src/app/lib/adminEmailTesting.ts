import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { mergeTestEmailTemplates } from "./brevoTestEmailCatalog";

export type TestEmailTemplateInfo = {
  key: string;
  template_id: number;
  preference_category: string | null;
  label: string;
  section: "course" | "graduation" | "events" | "payments";
  /** True when Functions list omitted this key — deploy admin email callables to enable send. */
  fromCatalogOnly: boolean;
};

export type SendTestTransactionalEmailResult = {
  ok: boolean;
  template_key: string;
  template_id: number;
  to: string;
  messageId: string | null;
  params: Record<string, unknown>;
};

export async function listTestEmailTemplates(): Promise<TestEmailTemplateInfo[]> {
  const fn = httpsCallable(functions, "adminListTestEmailTemplates");
  const res = await fn({});
  const data = res.data as {
    templates: Array<{
      key: string;
      template_id: number;
      preference_category: string | null;
    }>;
  };
  return mergeTestEmailTemplates(data.templates ?? []);
}

export async function sendTestTransactionalEmail(input: {
  to: string;
  templateKey: string;
  firstName?: string;
}): Promise<SendTestTransactionalEmailResult> {
  const fn = httpsCallable(functions, "adminSendTestTransactionalEmail");
  const payload: Record<string, unknown> = {
    to: input.to.trim(),
    template_key: input.templateKey,
  };
  if (input.firstName?.trim()) {
    payload.first_name = input.firstName.trim();
  }
  const res = await fn(payload);
  return res.data as SendTestTransactionalEmailResult;
}
