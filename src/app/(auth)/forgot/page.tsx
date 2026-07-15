import type { Metadata } from "next";
import { ForgotForm } from "@/components/ResetForms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <div className="card fade-up p-8">
      <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
      <p className="mt-1 mb-7 text-sm text-muted">
        Enter the email you signed up with and we&rsquo;ll send you a link.
      </p>
      <ForgotForm />
    </div>
  );
}
