"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const TOAST_MESSAGES: Record<string, { message: string; type: "success" | "error" }> = {
  created: { message: "Issue created successfully", type: "success" },
  updated: { message: "Issue updated successfully", type: "success" },
  deleted: { message: "Issue deleted", type: "success" },
};

export function ToastHandler({ toast: toastKey }: { toast?: string }) {
  const router = useRouter();
  useEffect(() => {
    if (!toastKey) return;
    const t = TOAST_MESSAGES[toastKey];
    if (t) {
      if (t.type === "success") toast.success(t.message);
      else toast.error(t.message);
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("toast");
    router.replace(url.pathname + (url.search || ""));
  }, [toastKey, router]);
  return null;
}
