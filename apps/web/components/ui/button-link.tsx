import Link from "next/link";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

const variants = {
  primary:
    "bg-primary text-white shadow-soft hover:bg-[#003d7d] focus-visible:outline-accent",
  secondary:
    "border border-border bg-white text-ink hover:border-primary hover:text-primary",
  ghost: "text-muted hover:text-primary"
};

export function ButtonLink({
  href,
  children,
  variant = "primary"
}: ButtonLinkProps) {
  return (
    <Link
      className={`focus-ring inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition ${variants[variant]}`}
      href={href}
    >
      {children}
    </Link>
  );
}

