import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";

export default function DiscoverLayout({ children }: LayoutProps<"/discover">) {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <Link href="/" aria-label="Builda home">
          <Wordmark size="sm" />
        </Link>
        <Link href="/discover" className="text-sm font-semibold text-ink-700 hover:text-green-700">
          Your discoveries
        </Link>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-20">{children}</div>
    </main>
  );
}
