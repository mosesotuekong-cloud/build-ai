import Link from "next/link";
import { MockBanner } from "@/components/console/mock-banner";
import { Wordmark } from "@/components/ui/wordmark";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { getMockStatus } from "@/lib/config/env";

export default async function ConsoleLayout({ children }: LayoutProps<"/console">) {
  const ctx = await requireFacilitator();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <MockBanner status={getMockStatus()} />
      <header className="border-b border-cream-200 bg-cream-100/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/console">
              <Wordmark size="sm" />
            </Link>
            {ctx.activeOrg && (
              <span className="hidden rounded-full bg-cream-200 px-3 py-1 text-sm font-medium text-ink-700 sm:inline">
                {ctx.activeOrg.orgName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/console/decks" className="font-semibold text-ink-700 hover:text-green-700">
              Decks
            </Link>
            <Link href="/console/kit" className="hidden font-semibold text-ink-700 hover:text-green-700 sm:inline">
              Game kit
            </Link>
            <Link href="/console/settings" className="font-semibold text-ink-700 hover:text-green-700">
              Settings
            </Link>
            {ctx.isPlatformAdmin && (
              <span className="rounded-full bg-green-100 px-3 py-1 font-semibold text-green-700">Super admin</span>
            )}
            <span className="hidden text-ink-500 md:inline">{ctx.email}</span>
            <form action="/auth/signout" method="post">
              <button className="font-semibold text-ink-700 hover:text-green-700">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
