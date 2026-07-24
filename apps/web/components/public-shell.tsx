"use client";

import { MobileBottomNav, useShowMobileNav } from "@/components/mobile-bottom-nav";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const showNav = useShowMobileNav();

  return (
    <div className={showNav ? "pb-[calc(3.25rem+env(safe-area-inset-bottom))] md:pb-0" : undefined}>
      {children}
      <MobileBottomNav />
    </div>
  );
}
