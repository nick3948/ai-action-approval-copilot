"use server";

import { disconnectService } from "@/lib/auth0-management";
import { auth0 } from "@/lib/auth0";
import { revalidatePath } from "next/cache";

export async function disconnectIntegrationAction(providerId: string) {
  const session = await auth0.getSession();
  if (!session) throw new Error("Unauthorized");

  await disconnectService(session.user.sub, providerId);
  revalidatePath("/integrations");
}
