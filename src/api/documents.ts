import type { Document } from '@/types';

export interface BackendDocument extends Record<string, unknown> {
  id: string;
  status: Document['status'];
  file_name?: string;
  document_type_code?: string;
  document_type_label?: string;
  size_bytes?: number;
  created_at?: string;
  expires_at?: string | null;
  download_url?: string;
  file_url?: string;
}

export function mapDocument(row: BackendDocument): Document {
  const expired = Boolean(row.expires_at && new Date(row.expires_at).getTime() < Date.now());
  const sizeBytes = Number(row.size_bytes ?? 0);
  const size = sizeBytes >= 1024 * 1024
    ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.ceil(sizeBytes / 1024)} KB`;

  return {
    id: row.id,
    title: row.file_name ?? row.document_type_label ?? row.document_type_code ?? 'Document',
    type: row.document_type_label ?? row.document_type_code ?? '',
    status: expired && row.status === 'approved' ? 'expired' : row.status,
    size: String(row.size ?? size),
    uploaded_by: String(row.member_name ?? row.uploaded_by ?? ''),
    date: String(row.created_at ?? row.date ?? ''),
    url: row.download_url ?? row.file_url,
    member_name: typeof row.member_name === 'string' ? row.member_name : undefined,
    member_phone: typeof row.member_phone === 'string' ? row.member_phone : undefined,
  };
}

export function mapDocumentSummary(row: Record<string, unknown>) {
  return {
    total: Number(row.required_count ?? 0),
    uploaded: Number(row.uploaded_count ?? 0),
    pending: Number(row.pending_count ?? 0),
    approved: Number(row.approved_count ?? 0),
    rejected: Number(row.rejected_count ?? 0),
    expired: Number(row.expired_count ?? 0),
    completion_pct: Number(row.completion_percent ?? 0),
  };
}
