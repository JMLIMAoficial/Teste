"use client";

import { useEffect, useState } from "react";
import { AdminDashboard, type AdminDashboardStats } from "@/components/admin-dashboard";
import { apiFetch } from "@/lib/auth";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<AdminDashboardStats>("/v1/admin/stats")
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-text-secondary">Carregando dashboard...</p>;
  }

  if (!stats) return null;

  return <AdminDashboard stats={stats} />;
}
