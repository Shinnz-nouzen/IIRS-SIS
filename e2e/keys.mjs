import { generateKeyPair, exportJWK } from "jose";
import { writeFileSync } from "node:fs";
const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });
const pub = { ...(await exportJWK(publicKey)), kid: "test-key-1", alg: "ES256", use: "sig" };
const priv = { ...(await exportJWK(privateKey)), kid: "test-key-1", alg: "ES256" };
writeFileSync("jwks.json", JSON.stringify({ keys: [pub] }));
writeFileSync("private.json", JSON.stringify(priv));
console.log("keys written");
