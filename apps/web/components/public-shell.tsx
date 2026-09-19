"use client";

import { ToastProvider } from "@/components/toast";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
