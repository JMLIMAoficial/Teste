"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAccessToken, fetchMe, getAccessToken } from "@/lib/auth";

type RequireAuthProps = {
  children: React.ReactNode;
  roles?: string[];
  redirectTo?: string;
};

export function RequireAuth({ children, roles, redirectTo = "/login" }: RequireAuthProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function check() {
      if (!getAccessToken()) {
        router.replace(redirectTo);
        return;
      }

      if (roles?.length) {
        try {
          const me = await fetchMe();
          if (!roles.some((role) => me.roles.includes(role))) {
            router.replace("/painel");
            return;
          }
        } catch {
          clearAccessToken();
          router.replace(redirectTo);
          return;
        }
      }

      setReady(true);
    }

    check();
  }, [router, redirectTo, roles]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary text-text-secondary">
        Carregando...
      </div>
    );
  }

  return <>{children}</>;
}
