/**
 * One-time HubSpot portal setup for the MORTAR contact sync.
 *
 * Creates the "MORTAR" contact property group and all v1 properties
 * (docs/HUBSPOT_INTEGRATION_PLAN.md §2.2) with exact internal names,
 * field types, and dropdown/checkbox option values.
 *
 * Idempotent: existing groups/properties are left untouched and reported
 * as "exists" — safe to run repeatedly, and safe to run against a portal
 * where some properties were already created by hand.
 *
 * Requirements:
 *   - Node 18+ (built-in fetch)
 *   - A private app token for the TARGET portal with scopes:
 *       crm.schemas.contacts.read, crm.schemas.contacts.write
 *     (the schemas scopes can be removed from the app after setup)
 *
 * Usage (macOS/Linux):
 *   HUBSPOT_TOKEN=pat-na1-... node functions/scripts/hubspot-create-properties.mjs
 *
 * Usage (Windows PowerShell):
 *   $env:HUBSPOT_TOKEN="pat-na1-..."
 *   node functions/scripts/hubspot-create-properties.mjs
 *
 * Add --dry-run to print what would be created without calling HubSpot's
 * write endpoints.
 */

const TOKEN = process.env.HUBSPOT_TOKEN?.trim();
const DRY_RUN = process.argv.includes("--dry-run");
const BASE = "https://api.hubapi.com/crm/v3/properties/contacts";
const GROUP_NAME = "mortar";
const GROUP_LABEL = "MORTAR";

if (!TOKEN) {
  console.error("Set HUBSPOT_TOKEN to a private app token for the target portal.");
  process.exit(1);
}

/** All v1 properties (plan §2.2, options §2.2.1–2.2.2). */
const PROPERTIES = [
  {
    name: "mortar_uid",
    label: "MORTAR UID",
    type: "string",
    fieldType: "text",
    hasUniqueValue: true,
    description: "Synced nightly from MORTAR (users doc id). Do not edit by hand.",
  },
  {
    name: "mortar_roles",
    label: "MORTAR Roles",
    type: "enumeration",
    fieldType: "checkbox",
    description: "Synced nightly from MORTAR (users.roles). Do not edit by hand.",
    options: [
      {label: "Admin", value: "admin"},
      {label: "Super Admin", value: "superadmin"},
      {label: "Digital Curriculum Students", value: "digital_curriculum_students"},
      {label: "Digital Curriculum Alumni", value: "digital_curriculum_alumni"},
      {label: "In Person Curriculum Students", value: "in_person_curriculum_students"},
      {label: "In Person Curriculum Alumni", value: "in_person_curriculum_alumni"},
    ],
  },
  {
    name: "mortar_onboarding_status",
    label: "MORTAR Onboarding Status",
    type: "enumeration",
    fieldType: "select",
    description: "Synced nightly from MORTAR (users.onboarding_status). Do not edit by hand.",
    options: [
      {label: "Needs Profile", value: "needs_profile"},
      {label: "Partial", value: "partial"},
      {label: "Complete", value: "complete"},
    ],
  },
  {
    name: "mortar_membership_status",
    label: "MORTAR Membership Status",
    type: "enumeration",
    fieldType: "select",
    description: "Synced nightly from MORTAR (users.membership.status; 'removed' is sync-owned). Do not edit by hand.",
    options: [
      {label: "Active", value: "active"},
      {label: "Removed", value: "removed"},
    ],
  },
  {
    name: "mortar_profile_completed",
    label: "MORTAR Profile Completed",
    type: "bool",
    fieldType: "booleancheckbox",
    description: "Synced nightly from MORTAR (users.profile_completed). Do not edit by hand.",
    options: [
      {label: "Yes", value: "true"},
      {label: "No", value: "false"},
    ],
  },
  {
    name: "mortar_in_cohort",
    label: "MORTAR In Cohort",
    type: "bool",
    fieldType: "booleancheckbox",
    description: "Synced nightly from MORTAR (!users.not_in_cohort). Do not edit by hand.",
    options: [
      {label: "Yes", value: "true"},
      {label: "No", value: "false"},
    ],
  },
  {
    name: "mortar_industry",
    label: "MORTAR Industry",
    type: "string",
    fieldType: "text",
    description: "Synced nightly from MORTAR (users.industry). Do not edit by hand.",
  },
  {
    name: "mortar_signup_date",
    label: "MORTAR Signup Date",
    type: "date",
    fieldType: "date",
    description: "Synced nightly from MORTAR (users.created_at). Do not edit by hand.",
  },
  {
    name: "mortar_email_opt_out_all",
    label: "MORTAR Email Opt Out (All)",
    type: "bool",
    fieldType: "booleancheckbox",
    description: "Synced nightly from MORTAR (users.email_opt_out_all). Suppression flag — respect before any HubSpot email. Do not edit by hand.",
    options: [
      {label: "Yes", value: "true"},
      {label: "No", value: "false"},
    ],
  },
];

async function hubspot(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "authorization": `Bearer ${TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // keep raw text
  }
  return {status: res.status, body: parsed};
}

async function ensureGroup() {
  const existing = await hubspot("GET", `/groups/${GROUP_NAME}`);
  if (existing.status === 200) {
    console.log(`group  ${GROUP_LABEL} (${GROUP_NAME}): exists`);
    return;
  }
  if (DRY_RUN) {
    console.log(`group  ${GROUP_LABEL} (${GROUP_NAME}): WOULD CREATE`);
    return;
  }
  const res = await hubspot("POST", "/groups", {
    name: GROUP_NAME,
    label: GROUP_LABEL,
  });
  if (res.status === 201 || res.status === 200) {
    console.log(`group  ${GROUP_LABEL} (${GROUP_NAME}): created`);
  } else {
    throw new Error(
      `Failed to create group (${res.status}): ${JSON.stringify(res.body)}`
    );
  }
}

async function ensureProperty(prop) {
  const existing = await hubspot("GET", `/${prop.name}`);
  if (existing.status === 200) {
    const grp = existing.body?.groupName;
    console.log(
      `prop   ${prop.name}: exists${grp && grp !== GROUP_NAME ? ` (NOTE: in group '${grp}', not '${GROUP_NAME}')` : ""}`
    );
    return {created: false};
  }
  if (DRY_RUN) {
    console.log(`prop   ${prop.name}: WOULD CREATE (${prop.type}/${prop.fieldType})`);
    return {created: false};
  }
  const res = await hubspot("POST", "", {...prop, groupName: GROUP_NAME});
  if (res.status === 201 || res.status === 200) {
    console.log(`prop   ${prop.name}: created (${prop.type}/${prop.fieldType})`);
    return {created: true};
  }
  console.error(
    `prop   ${prop.name}: FAILED (${res.status}): ${JSON.stringify(res.body)}`
  );
  return {created: false, failed: true};
}

async function main() {
  console.log(`MORTAR HubSpot property setup${DRY_RUN ? " (dry run)" : ""}`);

  // Sanity check: token works and points at the intended portal.
  const probe = await hubspot("GET", "?limit=1");
  if (probe.status === 401 || probe.status === 403) {
    throw new Error(
      `Token rejected (${probe.status}). Check the token and that the app has crm.schemas.contacts.read/write scopes.`
    );
  }

  await ensureGroup();

  let failed = 0;
  for (const prop of PROPERTIES) {
    const result = await ensureProperty(prop);
    if (result.failed) failed++;
  }

  if (failed > 0) {
    console.error(`\nDone with ${failed} failure(s) — fix and re-run (safe to repeat).`);
    process.exit(1);
  }
  console.log("\nDone. Verify in HubSpot: Settings → Properties → filter by group MORTAR.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
