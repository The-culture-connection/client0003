import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export type PausedSignup = {
  uid: string;
  email: string;
  name: string;
  createdAt: string | null;
  alreadyExcluded: boolean;
};

export type HubspotSyncStatus = {
  paused: boolean;
  pausedAt: string | null;
  pausedBy: string | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastSkippedPausedAt: string | null;
  lastResume: {
    resumed_at: string;
    resumed_by: string;
    paused_from: string | null;
    created_during_pause: number;
    deleted: number;
    kept: number;
  } | null;
  /** Accounts created since the pause began (empty when not paused). */
  createdDuringPause: PausedSignup[];
};

export type HubspotResumeResult = {
  ok: boolean;
  deletions: Array<{ uid: string; email: string; hubspot: "deleted" | "not_found" | "failed" | "no_email"; error?: string }>;
  sync: { upserted: number; failedBatches: number } | null;
  status: HubspotSyncStatus;
};

const control = () => httpsCallable(functions, "adminHubspotControl", { timeout: 540_000 });

export async function getHubspotSyncStatus(): Promise<HubspotSyncStatus> {
  return (await control()({ action: "status" })).data as HubspotSyncStatus;
}

export async function pauseHubspotSync(): Promise<HubspotSyncStatus> {
  return (await control()({ action: "pause" })).data as HubspotSyncStatus;
}

export async function resumeHubspotSync(input: {
  deleteUids: string[];
  syncNow: boolean;
}): Promise<HubspotResumeResult> {
  return (await control()({ action: "resume", ...input })).data as HubspotResumeResult;
}
