import { redirect } from "next/navigation";

export default function TagsPageRedirect() {
  redirect("/dashboard/settings/tags");
}
