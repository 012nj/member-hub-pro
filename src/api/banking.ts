import { api } from './client';

export interface CoopTransaction {
  id: string;
  transaction_date?: string;
  transaction_reference?: string;
  amount?: number;
  currency?: string;
  description?: string;
  status?: string;
  category?: string;
  type?: string;
  member_id?: string | null;
  member_name?: string | null;
  [key: string]: unknown;
}

interface CoopDateRange {
  account_number?: string;
  from_date: string;
  to_date: string;
}

export const coopApi = {
  getBalance: (account_number?: string) =>
    api.get<{
      status: string;
      message_reference: string;
      account_number: string;
      available_balance: number;
      booked_balance: number;
      currency: string;
      message_description: string;
    }>('/banking/coop/account/balance', { account_number: account_number ?? '' }),

  getMiniStatement: (account_number?: string) =>
    api.get<{
      status: string;
      message_reference: string;
      account_number: string;
      transactions: CoopTransaction[];
      message_description: string;
    }>('/banking/coop/account/ministatement', { account_number: account_number ?? '' }),

  getStatement: (params: CoopDateRange) =>
    api.get<{
      status: string;
      message_reference: string;
      account_number: string;
      transaction_count: number;
      transactions: CoopTransaction[];
      message_description: string;
    }>('/banking/coop/account/statement', params),

  getReconciliationStatus: () =>
    api.get<{
      pending_transfers: number;
      transfers_by_status: Record<string, number>;
      recent_transfers: Record<string, unknown>[];
      recent_reconciliation: Record<string, unknown>[];
    }>('/banking/coop/reconciliation/status'),

  reconcileStatement: (params: CoopDateRange) =>
    api.post<{ success: boolean; account_number: string; result: Record<string, unknown> }>(
      '/banking/coop/account/reconcile',
      params,
    ),

  getSyncHistory: (limit = 50) =>
    api.get<{ sync_history: Record<string, unknown>[] }>('/banking/coop/account/sync-history', { limit }),

  getDashboardSummary: () =>
    api.get<{
      balance: { available: number; booked: number; currency: string };
      today: { collections: number; disbursements: number; successful_transfers: number; failed_transfers: number };
      pending: { count: number; transfers_by_status: Record<string, number>; recent_transfers: Record<string, unknown>[] };
      reconciliation: { recent: Record<string, unknown>[] };
    }>('/banking/coop/dashboard/summary'),

  getFinancialSummary: () =>
    api.get<{ success: boolean; data: Record<string, unknown> }>('/banking/coop/dashboard/financial'),

  getReconciliationReport: () =>
    api.get<{ success: boolean; data: Record<string, unknown> }>('/banking/coop/reconciliation/report'),

  syncFullStatement: (params: CoopDateRange & { page_size?: number }) =>
    api.post<{ success: boolean; data: Record<string, unknown> }>('/banking/coop/account/sync', params),

  getTransactions: (params: {
    page?: number;
    per_page?: number;
    date_from?: string;
    date_to?: string;
    status?: string;
    category?: string;
    type?: string;
    member_id?: string;
    phone?: string;
    search?: string;
    bank_name?: string;
    transaction_state?: string;
  } = {}) =>
    api.get<{
      success: boolean;
      transactions: CoopTransaction[];
      pagination: { page: number; last_page: number; per_page: number; total: number };
    }>('/banking/coop/transactions', params),

  getTransaction: (id: string) =>
    api.get<{ success: boolean; data: CoopTransaction }>(`/banking/coop/transactions/${id}`),

  reconcileTransaction: (id: string, data: { member_id?: string; category?: string; narration?: string }) =>
    api.post<{ success: boolean; data: Record<string, unknown> }>(`/banking/coop/transactions/${id}/reconcile`, data),

  getUnmatchedTransactions: () =>
    api.get<{
      data: CoopTransaction[];
      pagination: { current_page: number; last_page: number; per_page: number; total: number };
    }>('/banking/coop/unmatched-transactions'),

  reconcileUnmatchedTransaction: (id: string, data: {
    match_type: 'contribution' | 'payout' | 'penalty' | 'fundrive';
    member_id: string;
    campaign_id?: string;
    penalty_id?: string;
  }) =>
    api.post<{ success: boolean; data: Record<string, unknown> }>(`/banking/coop/unmatched-transactions/${id}/reconcile`, data),

  getMemberTransactions: (memberId: string, page = 1) =>
    api.get<{ success: boolean; data: Record<string, unknown> }>(
      `/banking/coop/members/${memberId}/transactions`,
      { page },
    ),
};
