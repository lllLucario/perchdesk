import { redirect } from "next/navigation";

/**
 * The confirm step is now a modal inside the floorplan workspace.
 * This route is no longer part of the primary booking flow.
 */
export default function ConfirmPage() {
  redirect("/buildings");
}
