"use client";

import { useRouter } from "next/navigation";
import { CompanionVideosManager } from "@/components/companion-videos-manager";
import { PainelShell } from "@/components/painel-shell";
import { logout } from "@/lib/auth";

export default function PainelVideosPage() {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <PainelShell onLogout={handleLogout}>
      <CompanionVideosManager />
    </PainelShell>
  );
}
