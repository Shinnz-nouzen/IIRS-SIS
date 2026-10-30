import { SignJWT, importJWK } from "jose";
import { readFileSync } from "node:fs";
const priv = JSON.parse(readFileSync("/tmp/e2e/private.json", "utf8"));
const key = await importJWK(priv, "ES256");
export async function mint({ sub, role = "authenticated", hours = 24 }) {
  return new SignJWT({ role, aud: "authenticated", ...(sub ? { sub } : {}) })
    .setProtectedHeader({ alg: "ES256", kid: "test-key-1", typ: "JWT" })
    .setIssuedAt().setExpirationTime(`${hours}h`).sign(key);
}
if (process.argv[2] === "anon") console.log(await mint({ role: "anon" }));
