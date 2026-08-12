import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { PublicHeader } from "@/components/layout/public-header";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-surface">
      <PublicHeader />
      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-5 pb-14 pt-28 sm:px-8 lg:grid-cols-[0.9fr_0.75fr]">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink sm:text-5xl">Reset your password</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
            Enter the email for your YALUMNI account. The platform will issue a
            one-time reset link and keep the response private so unknown emails
            are not exposed.
          </p>
        </div>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
