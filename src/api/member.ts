import { api } from './client';
import type {
  Paginated,
  Contribution,
  Beneficiary,
  Notification,
  Document,
  EventItem,
  NewsArticle,
  Member,
  WithdrawalRequest,
  Penalty,
  Donation,
  DonationCampaign,
} from '@/types';
import { mapDocument, mapDocumentSummary, type BackendDocument } from './documents';

export interface StkPushRequest {
  phone: string;
  amount: number;
  account_ref: string;
  member_id?: string;
  paymentType: 'penalty' | 'donation' | 'monthly_contribution' | 'operational';
  transactionDesc?: string;
  penaltyIds?: string[];
  campaignId?: string;
}

export interface StkPushResponse {
  success: boolean;
  checkoutRequestId?: string;
  message: string;
}

export interface PaymentStatusResponse {
  status: string;
  message?: string;
  final?: boolean;
}

export const memberApi = {
  dashboard: () => api.get<{
    contributions_total: number;
    contributions_count: number;
    penalties_total: number;
    donations_total: number;
    upcoming_events: EventItem[];
    recent_contributions: Contribution[];
    unread_notifications: number;
    status: string;
    monthly_rate?: number;
    grace_days?: number;
    penalty_rate?: number;
    months_covered?: number;
  }>('/member/dashboard'),

  getContributions: (page = 1) =>
    api.get<Paginated<Contribution>>('/member/contributions', { page }),

  getBeneficiaries: () => api.get<Beneficiary[]>('/member/beneficiaries'),

  addBeneficiary: (data: Partial<Beneficiary>) =>
    api.post<Beneficiary>('/member/beneficiaries', data),

  updateBeneficiary: (id: string, data: Partial<Beneficiary>) =>
    api.put<Beneficiary>(`/member/beneficiaries/${id}`, data),

  deleteBeneficiary: (id: string) => api.delete<void>(`/member/beneficiaries/${id}`),

  getNotifications: () => api.get<Notification[]>('/member/notifications'),

  markNotificationRead: (id: string) =>
    api.patch<void>(`/member/notifications/${id}/read`),

  getDocuments: () =>
    api.get<{ data: BackendDocument[] }>('/documents/me')
      .then(({ data }) => data.map(mapDocument)),

  getDocumentSummary: () =>
    api.get<{ data: Record<string, unknown> }>('/documents/me/summary')
      .then(({ data }) => mapDocumentSummary(data)),

  getDocumentTypes: () =>
    api.get<{ data: { code: string; label: string }[] }>('/documents/types')
      .then(({ data }) => data.map(type => ({
        code: type.code,
        name: type.label,
        allowed_member_upload: type.code === 'national_id' || type.code === 'passport',
      }))),

  getEvents: () => api.get<EventItem[]>('/member/events'),

  getNews: (page = 1) =>
    api.get<Paginated<NewsArticle>>('/member/news', { page }),

  getProfile: () => api.get<Member>('/member/profile'),

  updateProfile: (data: Partial<Member>) =>
    api.put<Member>('/member/profile', data),

  getPenalties: () => api.get<Penalty[]>('/member/penalties'),

  payPenalty: (id: string, data: { method: string; phone?: string }) =>
    api.post<{ message: string; reference: string }>(`/member/penalties/${id}/pay`, data),

  uploadDocument: (data: { document_type_code: string; file: File; notes?: string; expires_at?: string }) => {
    const formData = new FormData();
    formData.append('document_type_code', data.document_type_code);
    formData.append('file', data.file);
    if (data.notes) formData.append('notes', data.notes);
    if (data.expires_at) formData.append('expires_at', data.expires_at);
    return api.post<Document>('/documents', formData);
  },

  replaceDocument: (id: string, data: { file: File; notes?: string; expires_at?: string }) => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.notes) formData.append('notes', data.notes);
    if (data.expires_at) formData.append('expires_at', data.expires_at);
    return api.post<Document>(`/documents/${id}/replace`, formData);
  },

  deleteDocument: (id: string) => api.delete<void>(`/documents/${id}?hard_delete=0`),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post<{ success: boolean }>('/auth/change-password', data),

  uploadProfilePhoto: (data: { file: File; userId: string }) => {
    const ext = data.file.name.split('.').pop() || 'png';
    const formData = new FormData();
    formData.append('file', data.file);
    return api.upload<{ url: string }>(`/storage/v1/object/profile-images/${data.userId}/profile.${ext}`, formData);
  },

  getWithdrawalReceipts: () => api.get<WithdrawalRequest[]>('/member/withdrawal-receipts'),

  getDonationCampaigns: () => api.get<DonationCampaign[]>('/member/donation-campaigns'),

  donate: (data: { campaign_id: string; amount: number; method: string; phone?: string }) =>
    api.post<{ message: string; reference: string }>('/member/donate', data),

  downloadStatement: (params?: { from?: string; to?: string }) => {
    const search = params
      ? '?' + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v || '')}`).join('&')
      : '';
    return api.download(`/member/downloads/statement${search}`, 'statement.csv');
  },

  downloadReceipt: (id: string) =>
    api.download(`/member/downloads/receipt/${id}`, `receipt-${id}.csv`),

  getExecutiveDashboard: (roleName: string) =>
    api.get<{ role: string; title: string; stats: { label: string; value: string }[]; actions: { label: string; route: string }[] }>(`/member/executive/${roleName}`),

  stkPush: (data: StkPushRequest) =>
    api.post<StkPushResponse>('/payments/stk-push', data),

  paymentStatus: (checkoutRequestId: string) =>
    api.get<PaymentStatusResponse>(`/payments/status/${checkoutRequestId}`),
};
