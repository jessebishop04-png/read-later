import { redirect } from "next/navigation";

export default function VideosAliasPage() {
  redirect("/library?view=videos");
}
