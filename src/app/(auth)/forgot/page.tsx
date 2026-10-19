import type { Metadata } from "next";
import { ForgotForm } from "@/components/ResetForms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <div className="card fade-up flex h-full flex-col justify-center p-6 sm:p-9">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Reset your password</h1>
      <p className="mt-2 mb-7 text-sm leading-relaxed text-muted">
        Enter the email you signed up with and we&rsquo;ll send you a link.
      </p>
      <ForgotForm />
    </div>
  );
}
