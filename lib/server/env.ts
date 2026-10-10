import "server-only";

import { resolve } from "node:path";
import { config } from "dotenv";

// Local development can reuse the existing backend secrets file. Vercel supplies
// these values through project environment variables instead.
config({ path: resolve(process.cwd(), "../../backend/.env"), override: false });

