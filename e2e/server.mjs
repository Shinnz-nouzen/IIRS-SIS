// TEST HARNESS ONLY. Presents a Supabase-shaped origin on :54321 for the app:
//  - /rest/v1/*          -> real PostgREST (:3001) over the real local Postgres
//  - /auth/v1/.well-known/jwks.json -> public key used to sign test sessions
//  - /storage/v1/*       -> in-memory MOCK of Supabase Storage (not the real service)
import http from "node:http";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";

const jwks = readFileSync("/tmp/e2e/jwks.json", "utf8");
const objects = new Map(); // path -> {bytes, type}
const tokens = new Map();  // token -> path
const origin = "http://localhost:54321";

function readBody(req) {
  return new Promise((resolve) => { const chunks = []; req.on("data", (c) => chunks.push(c)); req.on("end", () => resolve(Buffer.concat(chunks))); });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, origin);
  if (url.pathname === "/auth/v1/.well-known/jwks.json") {
    res.writeHead(200, { "content-type": "application/json" }); return res.end(jwks);
  }
  if (url.pathname.startsWith("/rest/v1/")) {
    const body = await readBody(req);
    const headers = { ...req.headers, host: "127.0.0.1:3001" };
    delete headers["content-length"];
    const upstream = http.request({ host: "127.0.0.1", port: 3001, method: req.method, path: url.pathname.replace("/rest/v1", "") + url.search, headers: { ...headers, "content-length": body.length } }, (up) => {
      res.writeHead(up.statusCode, up.headers); up.pipe(res);
    });
    upstream.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
    return upstream.end(body);
  }
  if (url.pathname.startsWith("/storage/v1/object/sign/student-photos") && req.method === "POST") {
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    const out = (body.paths || []).map((p) => {
      if (!objects.has(p)) return { error: "Object not found", path: p, signedURL: null };
      const token = crypto.randomUUID(); tokens.set(token, p);
      return { error: null, path: p, signedURL: `/object/sign/student-photos/${p}?token=${token}` };
    });
    res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(out));
  }
  if (url.pathname.startsWith("/storage/v1/object/sign/student-photos/") && req.method === "GET") {
    const p = decodeURIComponent(url.pathname.split("/").pop());
    const o = objects.get(p);
    if (!o || tokens.get(url.searchParams.get("token")) !== p) { res.writeHead(400); return res.end("{}"); }
    res.writeHead(200, { "content-type": o.type, "access-control-allow-origin": "*" }); return res.end(o.bytes);
  }
  if (url.pathname.startsWith("/storage/v1/object/student-photos/") && req.method === "POST") {
    const p = decodeURIComponent(url.pathname.split("/").pop());
    const body = await readBody(req);
    const ct = req.headers["content-type"] || "";
    let bytes = body, type = ct;
    if (ct.startsWith("multipart/form-data")) {
      // supabase-js sends multipart; keep the raw file part (strip boundary framing).
      const boundary = "--" + ct.split("boundary=")[1];
      const text = body.toString("latin1");
      const parts = text.split(boundary).filter((x) => x.includes("filename") || x.includes("Content-Type"));
      const part = parts[parts.length - 1] ?? "";
      const headEnd = part.indexOf("\r\n\r\n");
      const m = /Content-Type: ([^\r\n]+)/i.exec(part.slice(0, headEnd));
      type = m ? m[1] : "application/octet-stream";
      bytes = Buffer.from(part.slice(headEnd + 4, part.lastIndexOf("\r\n")), "latin1");
    }
    if (objects.has(p)) { res.writeHead(409); return res.end(JSON.stringify({ message: "exists" })); }
    objects.set(p, { bytes, type });
    res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ Key: `student-photos/${p}` }));
  }
  if (url.pathname === "/storage/v1/object/student-photos" && req.method === "DELETE") {
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    for (const p of body.prefixes || []) objects.delete(p);
    res.writeHead(200, { "content-type": "application/json" }); return res.end("[]");
  }
  if (url.pathname === "/__reset") { objects.clear(); tokens.clear(); res.writeHead(200); return res.end("ok"); }
  if (url.pathname === "/__objects") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify([...objects.entries()].map(([k, v]) => ({ path: k, type: v.type, size: v.bytes.length })))); }
  res.writeHead(404, { "content-type": "application/json" }); res.end(JSON.stringify({ message: "not mocked", path: url.pathname }));
});
server.listen(54321, "127.0.0.1", () => console.log("harness listening on 54321"));
