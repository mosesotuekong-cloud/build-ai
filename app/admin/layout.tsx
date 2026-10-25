import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { requireSuperAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const ctx = await requireSuperAdmin();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-cream-300 bg-green-600 text-cream-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Wordmark size="sm" tone="cream" />
            </Link>
            <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-ink-900 uppercase">Super admin</span>
          </div>
          <nav className="flex items-center gap-5 text-sm font-semibold">
            <Link href="/admin" className="hover:text-amber-300">
              Overview
            </Link>
            <Link href="/console" className="hover:text-amber-300">
              Console
            </Link>
            <span className="hidden text-cream-300 md:inline">{ctx.email}</span>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
