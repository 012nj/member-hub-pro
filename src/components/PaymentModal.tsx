import { useState, useEffect, useRef, useCallback } from 'react';
import { CreditCard, Smartphone, Landmark, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { ApiError } from '@/api/client';
import { mockMember } from '@/api/mock';
import { Button, Input, Select, Modal } from '@/components/ui';
import { formatCurrency } from '@/lib/format';

type PayMethod = 'mpesa' | 'bank';
type PaymentState = 'form' | 'sending' | 'pending' | 'success' | 'failed' | 'unconfirmed' | 'noted';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  accountRef: string;
  paymentType: 'monthly_contribution' | 'penalty' | 'donation';
  transactionDesc: string;
  phone?: string;
  campaignId?: string;
  penaltyIds?: string[];
  memberId?: string;
  bankDetails?: { account: string; accountNo: string; reference: string; paybill?: string };
  onSuccess?: () => void;
}

const POLL_INTERVAL = 10_000;
const MAX_ATTEMPTS = 60;
const SUCCESS_STATUSES = ['confirmed', 'paid', 'verified', 'reconciled'];
const FAILURE_STATUSES = ['failed', 'cancelled', 'reversed'];

export function PaymentModal({
  open, onClose, amount, accountRef, paymentType, transactionDesc,
  phone: initialPhone, campaignId, penaltyIds, memberId,
  bankDetails, onSuccess,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PayMethod>('mpesa');
  const [phone, setPhone] = useState(initialPhone || '');
  const [state, setState] = useState<PaymentState>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const checkoutIdRef = useRef('');

  useEffect(() => {
    if (open) {
      setMethod('mpesa');
      setPhone(initialPhone || '');
      setState('form');
      setErrorMsg('');
      attemptsRef.current = 0;
      checkoutIdRef.current = '';
    }
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [open, initialPhone]);

  const handleSuccess = useCallback(() => {
    setState('success');
    onSuccess?.();
  }, [onSuccess]);

  const pollStatus = useCallback((checkoutId: string) => {
    if (pollRef.current) clearTimeout(pollRef.current);
    if (attemptsRef.current >= MAX_ATTEMPTS) {
      setState('unconfirmed');
      setErrorMsg('We could not confirm the payment yet. Check your M-Pesa messages before retrying to avoid paying twice.');
      return;
    }
    attemptsRef.current += 1;
    pollRef.current = setTimeout(async () => {
      try {
        const res = await mockMember.paymentStatus(checkoutId);
        const status = typeof res.status === 'string' ? res.status.toLowerCase() : 'unknown';
        if (SUCCESS_STATUSES.includes(status)) {
          handleSuccess();
          return;
        }
        if (FAILURE_STATUSES.includes(status)) {
          setState('failed');
          setErrorMsg('Payment was not completed. Please try again.');
          return;
        }
        if (res.final === true) {
          setState('unconfirmed');
          setErrorMsg(res.message || 'We could not confirm the payment. Check your M-Pesa messages before retrying.');
          return;
        }
        pollStatus(checkoutId);
      } catch (error) {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          setState('failed');
          setErrorMsg(error.message);
          return;
        }
        pollStatus(checkoutId);
      }
    }, POLL_INTERVAL);
  }, [handleSuccess]);

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (method === 'bank') {
      setState('noted');
      return;
    }
    if (!phone) { setErrorMsg('M-Pesa phone number is required.'); return; }
    if (amount <= 0) { setErrorMsg('Amount must be greater than zero.'); return; }
    setErrorMsg('');
    setState('sending');
    try {
      const res = await mockMember.stkPush({
        phone, amount: Math.ceil(amount), account_ref: accountRef,
        member_id: memberId, paymentType, transactionDesc,
        campaignId, penaltyIds,
      });
      if (!res.success) {
        setState('failed');
        setErrorMsg(res.message || 'Could not initiate payment. Please try again.');
        return;
      }
      const checkoutId = res.checkoutRequestId;
      if (!checkoutId) {
        setState('failed');
        setErrorMsg('The payment provider did not return a checkout reference. Check your payment status before retrying.');
        return;
      }
      checkoutIdRef.current = checkoutId;
      setState('pending');
      pollStatus(checkoutId);
    } catch (error) {
      setState('failed');
      setErrorMsg(error instanceof Error ? error.message : 'Failed to send STK push. Please try again.');
    }
  };

  const canClose = state === 'form' || state === 'success' || state === 'failed' || state === 'unconfirmed' || state === 'noted';

  return (
    <Modal open={open} onClose={() => canClose && onClose()} title="M-Pesa Payment" size="sm">
      {state === 'form' && (
        <form onSubmit={submitPayment} className="space-y-4">
          <div className="p-3 rounded-xl bg-neutral-50 flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500">Amount</p>
              <p className="text-lg font-bold text-neutral-900">{formatCurrency(amount)}</p>
            </div>
            <span className="text-xs text-neutral-400 font-mono">{accountRef}</span>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-error-50 border border-error-200 text-sm text-error-700">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Select label="Payment Method" value={method} onChange={(e) => { setMethod(e.target.value as PayMethod); setErrorMsg(''); }}>
            <option value="mpesa">M-Pesa</option>
            <option value="bank">Bank Transfer</option>
          </Select>

          {method === 'mpesa' ? (
            <div>
              <label className="label">M-Pesa Phone Number</label>
              <div className="relative">
                <Smartphone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className="input-field pl-9"
                />
              </div>
              <p className="text-xs text-neutral-400 mt-1.5">You will receive an STK push prompt on your phone to authorize the payment.</p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-neutral-50 text-xs text-neutral-600 space-y-1">
              <p className="flex items-center gap-1.5 font-medium text-neutral-700"><Landmark size={13} /> Bank Transfer Details</p>
              <p>Account: {bankDetails?.account || 'KHWWC Welfare'}</p>
              <p>Account No: {bankDetails?.accountNo || '0123 4567 8901'}</p>
              <p>Reference: {bankDetails?.reference || accountRef}</p>
              <p className="mt-2 text-neutral-400">Use the reference above when making the transfer. Your payment will be verified by the treasurer.</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="inline-flex items-center gap-2">
              <CreditCard size={15} /> {method === 'mpesa' ? 'Send Prompt' : 'Confirm'}
            </Button>
          </div>
        </form>
      )}

      {state === 'sending' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 size={32} className="text-primary-600 animate-spin" />
          <p className="text-sm text-neutral-600">Sending payment prompt...</p>
        </div>
      )}

      {state === 'pending' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 size={32} className="text-warning-600 animate-spin" />
          <p className="text-sm font-medium text-neutral-700">Check your phone for the M-Pesa prompt</p>
          <p className="text-xs text-neutral-400 text-center max-w-xs">Enter your M-Pesa PIN to authorize the payment of {formatCurrency(amount)}. This page will update automatically once payment is confirmed.</p>
        </div>
      )}

      {state === 'success' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-14 h-14 rounded-full bg-success-50 flex items-center justify-center">
            <CheckCircle size={28} className="text-success-600" />
          </div>
          <p className="text-sm font-medium text-neutral-700">Payment {method === 'mpesa' ? 'Confirmed' : 'Noted'}</p>
          <p className="text-xs text-neutral-400 text-center max-w-xs">
            {method === 'mpesa'
              ? `Your payment of ${formatCurrency(amount)} has been confirmed. A receipt will be available shortly.`
              : `Please complete the bank transfer using the reference above. Your payment will be verified by the treasurer.`}
          </p>
          <Button variant="primary" onClick={onClose} className="mt-2">Close</Button>
        </div>
      )}

      {state === 'noted' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-14 h-14 rounded-full bg-warning-50 flex items-center justify-center">
            <Landmark size={26} className="text-warning-600" />
          </div>
          <p className="text-sm font-medium text-neutral-700">Bank transfer not yet verified</p>
          <p className="text-xs text-neutral-400 text-center max-w-xs">
            Complete the transfer using the displayed details. It will appear as paid after the treasurer verifies it.
          </p>
          <Button variant="primary" onClick={onClose} className="mt-2">Close</Button>
        </div>
      )}

      {state === 'unconfirmed' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-14 h-14 rounded-full bg-warning-50 flex items-center justify-center">
            <AlertCircle size={26} className="text-warning-600" />
          </div>
          <p className="text-sm font-medium text-neutral-700">Payment status not confirmed</p>
          <p className="text-xs text-neutral-400 text-center max-w-xs">{errorMsg}</p>
          <div className="flex gap-3 mt-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button variant="primary" onClick={() => {
              attemptsRef.current = 0;
              setState('pending');
              if (checkoutIdRef.current) pollStatus(checkoutIdRef.current);
            }}>Check again</Button>
          </div>
        </div>
      )}

      {state === 'failed' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-14 h-14 rounded-full bg-error-50 flex items-center justify-center">
            <XCircle size={28} className="text-error-600" />
          </div>
          <p className="text-sm font-medium text-neutral-700">Payment Failed</p>
          <p className="text-xs text-neutral-400 text-center max-w-xs">{errorMsg}</p>
          <div className="flex gap-3 mt-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button variant="primary" onClick={() => setState('form')}>Try Again</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
