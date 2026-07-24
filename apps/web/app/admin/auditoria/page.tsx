"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, fetchMe } from "@/lib/auth";

type AuditLog = {
  id: string;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

const actionLabels: Record<string, string> = {
  "profile.approved": "Perfil aprovado",
  "profile.rejected": "Perfil rejeitado",
  "profile.updated": "Perfil editado",
  "profile.verified": "Perfil verificado",
  "profile.unverified": "Verificação removida",
  "comment.approved": "Comentário aprovado",
  "comment.rejected": "Comentário rejeitado",
  "review.approved": "Avaliação aprovada",
  "review.rejected": "Avaliação rejeitada",
  "video.approved": "Vídeo aprovado",
  "video.rejected": "Vídeo rejeitado",
  "moment.approved": "Momento aprovado",
  "moment.rejected": "Momento rejeitado",
  "conversation.replied": "Conversa respondida",
  "conversation.closed": "Conversa encerrada",
  "settings.updated": "Configurações alteradas",
  "premium.activated": "Premium ativado",
  "premium.deactivated": "Premium removido",
  "featured.activated": "Destaque ativado",
  "featured.deactivated": "Destaque removido",
};

export default function AdminAuditoriaPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const me = await fetchMe();
      if (!me.roles.includes("admin")) {
        router.replace("/admin");
        return;
      }
      const data = await apiFetch<{ data: AuditLog[] }>("/v1/admin/audit-logs?limit=100");
      setLogs(data.data);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p className="text-text-secondary">Carregando...</p>;

  return (
    <>
      <h1 className="text-2xl font-bold text-text-primary">Auditoria</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Registro das ações administrativas (moderação, mensagens, configurações).
      </p>

      {logs.length === 0 ? (
        <p className="mt-8 text-text-muted">Nenhum registro ainda.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border-subtle">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-secondary text-text-muted">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Entidade</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-border-subtle">
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(log.createdAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-text-primary">
                    {actionLabels[log.action] ?? log.action}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{log.actorEmail ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">
                    {log.entityType ? `${log.entityType}:${log.entityId?.slice(0, 8)}…` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
