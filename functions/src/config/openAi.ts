import { defineSecret } from "firebase-functions/params";

/** Attach `{ secrets: [OPEN_AI_KEY] }` on any callable that calls the OpenAI API. */
export const OPEN_AI_KEY = defineSecret("OPEN_AI_KEY");
