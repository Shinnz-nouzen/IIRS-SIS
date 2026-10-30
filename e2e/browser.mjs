import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { mint } from "/tmp/e2e/mint.mjs";

export const BASE = "http://localhost:3000";
export const A_ID = "00000000-0000-4000-8000-0000000000a1";
export const B_ID = "00000000-0000-4000-8000-0000000000b2";

export async function launch() {
  return puppeteer.launch({
    args: [...chromium.args, "--no-sandbox", "--disable-gpu"],
    executablePath: await chromium.executablePath(),
    headless: "shell",
    defaultViewport: { width: 1280, height: 900 },
  });
}

export async function sessionCookie(userId) {
  const access = await mint({ sub: userId });
  const session = {
    access_token: access, refresh_token: "test-refresh", token_type: "bearer",
    expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86000,
    user: { id: userId, aud: "authenticated", role: "authenticated", email: `${userId}@example.invalid` },
  };
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  // @supabase/ssr chunks cookies above ~3180 chars
  const chunks = value.match(/.{1,3000}/g);
  const base = { domain: "localhost", path: "/", httpOnly: false, sameSite: "Lax" };
  return chunks.length === 1
    ? [{ ...base, name: "sb-localhost-auth-token", value }]
    : chunks.map((c, i) => ({ ...base, name: `sb-localhost-auth-token.${i}`, value: c }));
}
