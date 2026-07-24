import { RequireAuth } from "@/components/require-auth";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
