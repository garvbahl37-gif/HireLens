"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/cn";

export function LogoutButton({
  compact = false,
  variant = "default",
}: {
  compact?: boolean;
  /** "rail" renders a round button for the dark sidebar rail. */
  variant?: "default" | "rail";
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (variant === "rail") {
    return (
      <button
        onClick={logout}
        title="Log out"
        aria-label="Log out"
        className="rail-btn hover:!text-[#ffb3bf]"
      >
        <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </button>
    );
  }

  return (
    <button
      onClick={logout}
      title="Log out"
      aria-label="Log out"
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-lg text-sm font-medium text-muted transition-colors hover:bg-card hover:text-bad",
        compact ? "h-10 w-10 justify-center md:h-8 md:w-8" : "px-3 py-2"
      )}
    >
      <LogOut className="h-4 w-4" />
      {!compact && "Log out"}
    </button>
  );
}
