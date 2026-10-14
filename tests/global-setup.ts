import { execSync } from "node:child_process";
import { TEST_DB_URL } from "./db-url";

export default function globalSetup() {
  // Siapkan skema database khusus pengujian (dibuat otomatis bila belum ada).
  execSync("npx prisma db push --skip-generate --force-reset --accept-data-loss", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
  });
}
