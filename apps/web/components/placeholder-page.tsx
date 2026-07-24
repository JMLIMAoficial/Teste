import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/public-header";

export default function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
        <p className="mt-4 text-text-secondary">{description}</p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-xl bg-purple-deep px-6 py-3 text-sm font-medium text-white hover:bg-purple-light"
        >
          Voltar ao início
        </Link>
      </main>
      <PublicFooter />
    </div>
  );
}
