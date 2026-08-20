"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PainelValoresRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/painel/perfil#valores");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary text-text-secondary">
      Redirecionando...
    </div>
  );
}
