/**
 * Run before other function modules load so Gen 2 defaults apply to all v2 handlers.
 */
import { setGlobalOptions } from "firebase-functions/v2/options";

setGlobalOptions({ region: "us-central1", maxInstances: 10 });
