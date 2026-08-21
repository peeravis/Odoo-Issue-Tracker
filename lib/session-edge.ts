import { jwtVerify } from "jose";
import type { SessionPayload } from "./session";

const secretKey = process.env.SESSION_SECRET;
if (!secretKey || secretKey.length < 32) {
  throw new Error(
    "SESSION_SECRET env var must be set and at least 32 characters."
  );
}
const encodedKey = new TextEncoder().encode(secretKey);

export async function decrypt(session?: string): Promise<SessionPayload | null> {
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
