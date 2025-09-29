import { cookies } from "next/headers";
import { verifySession } from "./session";

export async function getCurrentUser() {
  const token = cookies().get("session")?.value;
  if (!token) return null;
  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}
