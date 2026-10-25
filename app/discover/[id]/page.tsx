import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiscoveryGame } from "@/components/discover/discovery-game";
import { getOwnDiscovery } from "@/lib/discover/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Discovery" };

export default async function DiscoveryPage({ params }: PageProps<"/discover/[id]">) {
  const { id } = await params;
  const own = await getOwnDiscovery(id);
  if (!own) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  return <DiscoveryGame discovery={own.discovery} anonymous={Boolean(auth.user?.is_anonymous)} />;
}
