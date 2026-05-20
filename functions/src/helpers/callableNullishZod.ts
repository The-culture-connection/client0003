import {z} from "zod";

/** Firebase callable clients often send `null` for omitted optional fields; treat as undefined. */
export function nullishUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === null ? undefined : v), schema);
}
