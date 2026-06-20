import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/** For API route handlers — returns the user or null (caller returns 401). */
export async function getApiUser() {
  return getCurrentUser();
}
