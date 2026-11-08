import { toast } from "sonner";
import { api } from "./api";

/** Creates (or reuses) the recipe's share link and copies it. Returns whether it worked. */
export async function copyShareLink(id: number): Promise<boolean> {
  try {
    const { share_url } = await api.recipes.share(id);
    await navigator.clipboard.writeText(`${window.location.origin}${share_url}`);
    toast.success("Share link copied to clipboard");
    return true;
  } catch {
    toast.error("Failed to share recipe");
    return false;
  }
}

export async function sendToMealie(id: number) {
  try {
    const result = await api.recipes.sendToMealie(id);
    if (result.ok) toast.success("Recipe sent to Mealie");
    else toast.error(result.error || "Failed to send to Mealie");
  } catch {
    toast.error("Failed to send to Mealie");
  }
}
