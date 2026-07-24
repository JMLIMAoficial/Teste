"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function AdminPremiumRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("premium", "true");
    router.replace(`/admin/perfis?${params}`);
  }, [router, searchParams]);

  return <p className="text-text-secondary">Redirecionando para perfis...</p>;
}
