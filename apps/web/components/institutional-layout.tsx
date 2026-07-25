import Link from "next/link";
import { PublicPageLayout } from "@/components/public-header";

export function InstitutionalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <PublicPageLayout mainClassName="mx-auto flex-1 max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
      <div className="prose prose-invert mt-8 max-w-none space-y-4 text-text-secondary [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-text-primary [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed">
        {children}
      </div>
      <Link
        href="/"
        className="mt-10 inline-flex rounded-xl border border-border-subtle px-5 py-2.5 text-sm text-text-secondary hover:border-purple-deep/40 hover:text-text-primary"
      >
        ← Voltar ao início
      </Link>
    </PublicPageLayout>
  );
}
