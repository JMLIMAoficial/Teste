"use client";

import { useRouter } from "next/navigation";
import { CompanionAlbumManager } from "@/components/companion-album-manager";
import { PainelShell } from "@/components/painel-shell";
import { logout } from "@/lib/auth";

export default function PainelFotosPage() {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <PainelShell onLogout={handleLogout}>
      <CompanionAlbumManager />
    </PainelShell>
  );
}
