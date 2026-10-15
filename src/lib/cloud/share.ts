import type { SharePayload } from "./types";

/**
 * Share links are self-contained: the report is gzip-compressed (and optionally
 * AES-GCM encrypted with a password) into the URL *fragment*, which browsers never
 * send to a server. Anyone with the link — and password — can open it; no backend.
 */

const VERSION = "1";
const PBKDF2_ITERATIONS = 210_000;

export class ShareError extends Error {
  constructor(readonly code: "invalid" | "wrong-password" | "unsupported") {
    super(code);
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function shareSupported(): boolean {
  return typeof CompressionStream !== "undefined" && typeof crypto?.subtle !== "undefined";
}

export async function encodeShare(payload: SharePayload, password?: string): Promise<string> {
  if (!shareSupported()) throw new ShareError("unsupported");
  const packed = await pipe(new TextEncoder().encode(JSON.stringify(payload)), new CompressionStream("gzip"));
  if (!password) return `${VERSION}.${toBase64Url(packed)}`;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, packed));
  const out = new Uint8Array(salt.length + iv.length + cipher.length);
  out.set(salt, 0);
  out.set(iv, salt.length);
  out.set(cipher, salt.length + iv.length);
  return `${VERSION}e.${toBase64Url(out)}`;
}

export function isProtectedToken(token: string): boolean {
  return token.startsWith(`${VERSION}e.`);
}

export async function decodeShare(token: string, password?: string): Promise<SharePayload> {
  if (!shareSupported()) throw new ShareError("unsupported");
  const [prefix, body] = token.split(".", 2);
  if (!body || (prefix !== VERSION && prefix !== `${VERSION}e`)) throw new ShareError("invalid");
  let packed: Uint8Array;
  try {
    packed = fromBase64Url(body);
  } catch {
    throw new ShareError("invalid");
  }
  if (prefix === `${VERSION}e`) {
    if (!password) throw new ShareError("wrong-password");
    try {
      const key = await deriveKey(password, packed.subarray(0, 16));
      packed = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: packed.subarray(16, 28) }, key, packed.subarray(28)));
    } catch {
      throw new ShareError("wrong-password");
    }
  }
  try {
    const json = new TextDecoder().decode(await pipe(packed, new DecompressionStream("gzip")));
    const payload = JSON.parse(json) as SharePayload;
    if (payload.v !== 1 || !payload.summary) throw new Error("bad payload");
    return payload;
  } catch {
    throw new ShareError("invalid");
  }
}

export function shareUrl(token: string, origin = window.location.origin): string {
  return `${origin}/shared#${token}`;
}
