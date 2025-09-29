import { SignJWT, jwtVerify } from "jose";

const secretStr = process.env.JWT_SECRET;
if (!secretStr) {
  throw new Error("JWT_SECRET is not set");
}
const secret = new TextEncoder().encode(secretStr);
const alg = "HS256";

export type SessionPayload = {
  sub: string;                 // user.uuid
  email: string;
  name: string;
  role: "admin" | "visitor";
};

export async function createSession(payload: SessionPayload, exp = "7d") {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secret);
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, secret, { algorithms: [alg] });
  return payload as SessionPayload;
}
