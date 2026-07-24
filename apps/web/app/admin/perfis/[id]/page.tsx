"use client";

import { use } from "react";
import { AdminProfileDetail } from "@/components/admin-profile-detail";

export default function AdminPerfilDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AdminProfileDetail profileId={id} />;
}
