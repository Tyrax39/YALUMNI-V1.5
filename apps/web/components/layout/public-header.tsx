import Link from "next/link";
import Image from "next/image";

import { ButtonLink } from "@/components/ui/button-link";
import { primaryNav } from "@/lib/site";

export function PublicHeader() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
      <Link className="focus-ring rounded-lg" href="/">
        <Image
          alt="YALUMNI"
          className="h-10 w-auto"
          height={40}
          priority
          src="/brand/yalumni-logo-horizontal.svg"
          width={156}
        />
      </Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
        {primaryNav.slice(0, 4).map((item) => (
          <Link
            className="focus-ring rounded-md text-sm font-semibold text-muted transition hover:text-primary"
            href={item.href}
            key={item.label}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <ButtonLink href="/login" variant="ghost">
          Sign in
        </ButtonLink>
        <ButtonLink href="/register">Join</ButtonLink>
      </div>
    </header>
  );
}
