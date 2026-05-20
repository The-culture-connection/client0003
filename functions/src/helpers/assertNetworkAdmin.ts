import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";

const db = getFirestore();
const auth = getAuth();

function rolesFromAuthToken(token: Record<string, unknown> | undefined): string[] {
  if (!token) return [];
  const raw = token.roles;
  if (Array.isArray(raw)) {
    return raw.filter((r): r is string => typeof r === "string");
  }
  if (typeof raw === "string") return [raw];
  return [];
}

export async function assertCallerIsNetworkAdmin(
  uid: string,
  options?: {authToken?: Record<string, unknown>}
): Promise<void> {
  const tokenRoles = rolesFromAuthToken(options?.authToken);
  if (tokenRoles.includes("Admin") || tokenRoles.includes("superAdmin")) {
    return;
  }

  const udoc = await db.collection("users").doc(uid).get();
  const roles: string[] = Array.isArray(udoc.data()?.roles) ? (udoc.data()?.roles as string[]) : [];
  const single = udoc.data()?.role as string | undefined;
  const eligible = single ? [single, ...roles] : roles;
  if (eligible.includes("Admin") || eligible.includes("superAdmin")) {
    return;
  }
  const user = await auth.getUser(uid);
  const em = user.email?.trim().toLowerCase();
  if (em) {
    const es = await db.collection("eligibleUsers").doc(em).get();
    const r = es.data()?.role as string | undefined;
    if (r === "Admin" || r === "superAdmin") return;
  }
  throw new HttpsError("permission-denied", "Admin or superAdmin only.");
}
