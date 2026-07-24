"use client";

import { useRouter } from "next/navigation";
import { CompanionProfileEditor } from "@/components/companion-profile-editor";
import { PainelShell } from "@/components/painel-shell";
import { logout } from "@/lib/auth";

export default function PainelPerfilPage() {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <PainelShell onLogout={handleLogout}>
      <CompanionProfileEditor />
    </PainelShell>
  );
}
