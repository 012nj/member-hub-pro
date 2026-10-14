<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\HttpException;
use App\Jobs\SendBulkSmsJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Defaulters = members with unpaid contribution months (up to the current
 * month) and/or unpaid penalties. Penalties are collected into the penalty
 * wallet when paid, so the penalty balance shown here is what the penalty
 * wallet is still owed by each member.
 *
 * Actions: suspend, activate, warning (formal notice), reminder (gentle).
 */
class DefaulterController extends PortalController
{
    private const VIEW_ROLES = ['admin', 'treasurer', 'secretary', 'chairperson', 'office'];
    private const ACTION_ROLES = ['admin', 'secretary', 'chairperson'];

    public function index(Request $request): JsonResponse
    {
        $this->requireAnyRole($request, self::VIEW_ROLES);
        $now = (int) now()->format('Y') * 100 + (int) now()->format('n');

        $contrib = DB::table('contributions')
            ->where('status', '!=', 'paid')
            ->whereRaw('(year * 100 + month) <= ?', [$now])
            ->groupBy('member_id')
            ->selectRaw('member_id, COUNT(id) as unpaid_months, SUM(amount) as arrears, MIN(due_date) as oldest_due')
            ->get()->keyBy('member_id');

        $penalties = DB::table('penalties')
            ->where('is_paid', 0)
            ->groupBy('member_id')
            ->selectRaw('member_id, COUNT(id) as penalty_count, SUM(amount) as penalty_balance')
            ->get()->keyBy('member_id');

        $ids = $contrib->keys()->merge($penalties->keys())->unique()->values()->all();
        if (! $ids) {
            return response()->json([]);
        }

        $lastPaid = DB::table('payments')->whereIn('member_id', $ids)
            ->groupBy('member_id')->selectRaw('member_id, MAX(received_at) as last_paid')
            ->pluck('last_paid', 'member_id');

        $rows = DB::table('members')->whereIn('id', $ids)
            ->select('id', 'name', 'member_id', 'phone', 'status', 'is_active')->get()
            ->map(function ($m) use ($contrib, $penalties, $lastPaid) {
                $c = $contrib->get($m->id);
                $p = $penalties->get($m->id);
                $missed = (int) ($c->unpaid_months ?? 0);
                $arrears = (float) ($c->arrears ?? 0);
                $penalty = (float) ($p->penalty_balance ?? 0);
                $suspended = ! $m->is_active || $m->status === 'suspended';

                return [
                    'id' => $m->id,
                    'member_name' => $m->name,
                    'member_number' => $m->member_id,
                    'phone' => $m->phone,
                    'missed_periods' => $missed,
                    'contribution_arrears' => $arrears,
                    'penalty_balance' => $penalty,
                    'penalty_count' => (int) ($p->penalty_count ?? 0),
                    'outstanding_amount' => $arrears + $penalty,
                    'oldest_due' => $c->oldest_due ?? null,
                    'last_payment_date' => $lastPaid[$m->id] ?? null,
                    'status' => $missed >= 3 ? 'critical' : ($missed >= 2 ? 'action' : 'warning'),
                    'account_status' => $suspended ? 'suspended' : 'active',
                    'last_notice_at' => DB::table('defaulter_actions')->where('member_id', $m->id)
                        ->whereIn('action', ['warning', 'reminder'])->max('created_at'),
                ];
            })
            ->sortByDesc('outstanding_amount')->values();

        return response()->json($rows);
    }

    public function action(Request $request, string $id, string $action): JsonResponse
    {
        $identity = $this->requireAnyRole($request, self::ACTION_ROLES);
        $data = $request->validate(['message' => 'nullable|string|max:600', 'reason' => 'nullable|string|max:500']);

        $member = DB::table('members')->where('id', $id)->first();
        if (! $member) {
            throw new HttpException(404, 'member_not_found', 'Member not found.');
        }

        $owed = (float) DB::table('contributions')->where('member_id', $id)->where('status', '!=', 'paid')
            ->whereRaw('(year * 100 + month) <= ?', [(int) now()->format('Y') * 100 + (int) now()->format('n')])->sum('amount');
        $penalty = (float) DB::table('penalties')->where('member_id', $id)->where('is_paid', 0)->sum('amount');
        $total = number_format($owed + $penalty, 2);
        $first = explode(' ', (string) $member->name)[0];

        $message = match ($action) {
            'suspend' => "Dear {$first}, your KHWWC membership has been suspended due to outstanding arrears of KES {$total}. Clear the balance to be reactivated.",
            'activate' => "Dear {$first}, your KHWWC membership has been reactivated. Thank you.",
            'warning' => $data['message'] ?? "WARNING: Dear {$first}, you owe KHWWC KES {$total} (contributions KES ".number_format($owed, 2).', penalties KES '.number_format($penalty, 2).'). Pay within 7 days to avoid suspension.',
            'reminder' => $data['message'] ?? "Reminder: Dear {$first}, kindly clear your KHWWC balance of KES {$total}. Pay via the member portal. Thank you.",
        };

        DB::transaction(function () use ($action, $id, $member, $identity, $message, $data) {
            if ($action === 'suspend') {
                DB::table('members')->where('id', $id)->update(['status' => 'suspended', 'is_active' => 0, 'updated_at' => now()]);
            } elseif ($action === 'activate') {
                DB::table('members')->where('id', $id)->update(['status' => 'active', 'is_active' => 1, 'updated_at' => now()]);
            }

            DB::table('defaulter_actions')->insert([
                'id' => (string) Str::uuid(), 'member_id' => $id, 'action' => $action,
                'message' => $message, 'reason' => $data['reason'] ?? null,
                'performed_by' => $identity['user_id'], 'created_at' => now(), 'updated_at' => now(),
            ]);

            if ($member->user_id) {
                DB::table('notifications')->insert([
                    'id' => (string) Str::uuid(), 'user_id' => $member->user_id,
                    'title' => match ($action) {
                        'suspend' => 'Membership suspended', 'activate' => 'Membership reactivated',
                        'warning' => 'Arrears warning', default => 'Payment reminder',
                    },
                    'message' => $message, 'is_read' => false, 'type' => 'defaulter_'.$action, 'created_at' => now(),
                ]);
            }
        });

        if ($member->phone) {
            SendBulkSmsJob::dispatch([$member->phone], $message, $this->uuid());
        }
        $this->audit($request, 'DEFAULTER_'.strtoupper($action), ['by' => $identity['user_id']], $id);

        return response()->json($this->ok(ucfirst($action).' applied to '.$member->name));
    }

    /** Bulk reminder/warning to every current defaulter. */
    public function bulk(Request $request, string $action): JsonResponse
    {
        $this->requireAnyRole($request, self::ACTION_ROLES);
        $ids = (array) $request->input('member_ids', []);
        foreach ($ids as $id) {
            $this->action($request, (string) $id, $action);
        }

        return response()->json($this->ok(count($ids).' members notified'));
    }
}
