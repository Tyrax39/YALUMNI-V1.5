import Link from "next/link";
import Image from "next/image";

import { ButtonLink } from "@/components/ui/button-link";
import { primaryNav } from "@/lib/site";

export function PublicHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/15 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.05)] backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link className="focus-ring shrink-0 rounded-lg" href="/">
          <Image
            alt="YALUMNI"
            className="block h-auto w-[132px] object-contain sm:w-[156px]"
            height={34}
            priority
            src="/brand/yalumni-logo-horizontal.svg"
            width={156}
          />
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
          {primaryNav.map((item) => (
            <Link
              className="focus-ring rounded-md text-sm font-semibold text-slate-600 transition hover:text-primary"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden sm:block">
            <ButtonLink href="/login" variant="ghost">
              Sign in
            </ButtonLink>
          </div>
          <ButtonLink href="/register">Join</ButtonLink>
        </div>
      </div>
    </header>
  );
}
