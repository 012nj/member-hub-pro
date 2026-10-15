<?php

namespace Database\Seeders;

use App\Support\Uuid;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LocalDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('LocalDemoSeeder can only run in a local or testing environment.');
        }

        $count = max(1, (int) env('LOCAL_DEMO_MEMBER_COUNT', 1000));
        $password = (string) env('LOCAL_DEMO_PASSWORD', 'LocalDemo2026');
        $now = now();

        $this->seedStaff($now, $password);

        for ($offset = 0; $offset < $count; $offset += 250) {
            $rows = [];
            $limit = min(250, $count - $offset);

            for ($index = 1; $index <= $limit; $index++) {
                $number = $offset + $index;
                $memberCode = sprintf('LOCAL-DEMO-%04d', $number);
                $email = sprintf('member%04d@local.khwwc.test', $number);
                $phone = sprintf('+254711%07d', $number);
                $userId = $this->userIdForEmail($email);

                DB::table('auth_users')->updateOrInsert(
                    ['email' => $email],
                    [
                        'id' => $userId,
                        'phone' => $phone,
                        'encrypted_password' => password_hash($password, PASSWORD_BCRYPT),
                        'is_banned' => 0,
                        'must_change_password' => 0,
                        'raw_user_meta_data' => json_encode(['name' => "Local Demo Member {$number}"]),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]
                );

                $rows[] = [
                    'id' => $userId,
                    'user_id' => $userId,
                    'name' => "Local Demo Member {$number}",
                    'phone' => $phone,
                    'member_id' => $memberCode,
                    'total_contributions' => 0,
                    'total_penalties' => 0,
                    'is_active' => 1,
                    'source' => 'local_demo',
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            foreach ($rows as $row) {
                DB::table('members')->updateOrInsert(
                    ['member_id' => $row['member_id']],
                    $row
                );
                DB::table('user_roles')->updateOrInsert(
                    ['user_id' => $row['user_id'], 'role' => 'member'],
                    ['id' => Uuid::v4(), 'is_active' => 1]
                );
            }

            $seeded = $offset + $limit;
            $this->command?->info("Seeded {$seeded}/{$count} local demo members");
        }

        $this->seedDashboardActivity($now);

        $this->command?->table(
            ['role', 'email', 'password'],
            [
                ['admin', 'admin@local.khwwc.test', $password],
                ['super_admin', 'superadmin@local.khwwc.test', $password],
                ['chairperson', 'chairperson@local.khwwc.test', $password],
                ['vice_chairperson', 'vicechairperson@local.khwwc.test', $password],
                ['secretary', 'secretary@local.khwwc.test', $password],
                ['vice_secretary', 'v-secretary@local.khwwc.test', $password],
                ['treasurer', 'treasurer@local.khwwc.test', $password],
                ['patron', 'patron@local.khwwc.test', $password],
                ['member', 'member0001@local.khwwc.test', $password],
            ]
        );
    }

    private function seedStaff(\Illuminate\Support\Carbon $now, string $password): void
    {
        $staff = [
            ['role' => 'admin', 'name' => 'Local Administrator', 'email' => 'admin@local.khwwc.test', 'phone' => '+254720000004'],
            ['role' => 'super_admin', 'name' => 'Local Super Administrator', 'email' => 'superadmin@local.khwwc.test', 'phone' => '+254720000005'],
            ['role' => 'chairperson', 'name' => 'Local Chairperson', 'email' => 'chairperson@local.khwwc.test', 'phone' => '+254720000001'],
            ['role' => 'vice_chairperson', 'name' => 'Local Vice Chairperson', 'email' => 'vicechairperson@local.khwwc.test', 'phone' => '+254720000006'],
            ['role' => 'secretary', 'name' => 'Local Secretary', 'email' => 'secretary@local.khwwc.test', 'phone' => '+254720000002'],
            ['role' => 'vice_secretary', 'name' => 'Local Vice Secretary', 'email' => 'v-secretary@local.khwwc.test', 'phone' => '+254720000007'],
            ['role' => 'treasurer', 'name' => 'Local Treasurer', 'email' => 'treasurer@local.khwwc.test', 'phone' => '+254720000003'],
            ['role' => 'patron', 'name' => 'Local Patron', 'email' => 'patron@local.khwwc.test', 'phone' => '+254720000008'],
        ];

        foreach ($staff as $person) {
            $userId = $this->userIdForEmail($person['email']);
            DB::table('auth_users')->updateOrInsert(
                ['email' => $person['email']],
                [
                    'id' => $userId,
                    'phone' => $person['phone'],
                    'encrypted_password' => password_hash($password, PASSWORD_BCRYPT),
                    'is_banned' => 0,
                    'must_change_password' => 0,
                    'raw_user_meta_data' => json_encode(['name' => $person['name']]),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );

            DB::table('members')->updateOrInsert(
                ['user_id' => $userId],
                [
                    'id' => $userId,
                    'user_id' => $userId,
                    'name' => $person['name'],
                    'phone' => $person['phone'],
                    'member_id' => 'LOCAL-'.strtoupper($person['role']),
                    'total_contributions' => 0,
                    'total_penalties' => 0,
                    'is_active' => 1,
                    'source' => 'local_demo',
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );

            DB::table('user_roles')->updateOrInsert(
                ['user_id' => $userId, 'role' => $person['role']],
                ['id' => Uuid::v4(), 'is_active' => 1]
            );
            if (in_array($person['role'], ['admin', 'super_admin'], true)) {
                DB::table('user_roles')->updateOrInsert(
                    ['user_id' => $userId, 'role' => 'admin'],
                    ['id' => Uuid::v4(), 'is_active' => 1]
                );
            }
            DB::table('user_roles')->updateOrInsert(
                ['user_id' => $userId, 'role' => 'member'],
                ['id' => Uuid::v4(), 'is_active' => 1]
            );
        }
    }

    private function seedDashboardActivity(\Illuminate\Support\Carbon $now): void
    {
        $members = DB::table('members')
            ->where('source', 'local_demo')
            ->orderBy('member_id')
            ->limit(40)
            ->get(['id', 'member_id', 'phone']);

        foreach ($members as $index => $member) {
            for ($offset = 0; $offset < 12; $offset++) {
                $period = $now->copy()->startOfMonth()->subMonths($offset);
                $isPaid = ($index + $offset) % 5 !== 0;
                $paymentRef = $isPaid
                    ? sprintf('LD-%s-%04d', $period->format('Ym'), $index + 1)
                    : null;
                $date = $period->copy()->addDays(min(($index * 2) % 25, 27));

                DB::table('contributions')->updateOrInsert(
                    [
                        'member_id' => $member->id,
                        'month' => (int) $period->format('n'),
                        'year' => (int) $period->format('Y'),
                    ],
                    [
                        'id' => Uuid::v4(),
                        'amount' => 300,
                        'due_date' => $period->copy()->day(5)->format('Y-m-d'),
                        'paid_date' => $isPaid ? $date->format('Y-m-d') : null,
                        'status' => $isPaid ? 'paid' : 'pending',
                        'payment_ref' => $paymentRef,
                        'created_at' => $date,
                        'updated_at' => $now,
                    ]
                );
            }
        }

        foreach ([
            ['table' => 'donation_wallet', 'id' => 'LOCAL-DEMO-DONATION', 'total_balance' => 875000, 'total_received' => 925000, 'total_withdrawn' => 50000],
            ['table' => 'penalty_wallet', 'id' => 'LOCAL-DEMO-PENALTY', 'total_balance' => 28500, 'total_received' => 38500, 'total_withdrawn' => 10000],
            ['table' => 'operational_wallet', 'id' => 'LOCAL-DEMO-OPERATIONAL', 'total_balance' => 1850000, 'total_received' => 2050000, 'total_withdrawn' => 200000],
        ] as $wallet) {
            $table = $wallet['table'];
            unset($wallet['table']);
            $updatedAtColumn = $table === 'penalty_wallet' ? 'last_updated' : 'updated_at';
            DB::table($table)->updateOrInsert(
                ['id' => $wallet['id']],
                $wallet + [$updatedAtColumn => $now]
            );
        }

        foreach (range(1, 12) as $number) {
            $period = $now->copy()->startOfMonth()->subMonths($number - 1);
            $reference = sprintf('LOCAL-DEMO-BANK-%s-%02d', $period->format('Ym'), $number);
            $amount = 12000 + ($number * 750);
            DB::table('bank_transactions')->updateOrInsert(
                ['transaction_reference' => $reference],
                [
                    'id' => Uuid::v4(),
                    'bank_name' => 'coop',
                    'member_id' => $members[($number - 1) % max($members->count(), 1)]->id ?? null,
                    'phone' => $members[($number - 1) % max($members->count(), 1)]->phone ?? '+254720000000',
                    'amount' => $amount,
                    'transaction_date' => $period->copy()->day(10)->format('Y-m-d'),
                    'month' => (int) $period->format('n'),
                    'year' => (int) $period->format('Y'),
                    'transaction_type' => 'credit',
                    'credit_amount' => $amount,
                    'debit_amount' => 0,
                    'transaction_reference' => $reference,
                    'bank_transaction_reference' => $reference,
                    'narration' => 'Local demo bank credit',
                    'reconciliation_status' => 'matched',
                    'bank_balance' => 6900000 + ((13 - $number) * 1000),
                    'created_at' => $period->copy()->day(10),
                    'updated_at' => $now,
                ]
            );
        }

        $treasurerId = DB::table('auth_users')->where('email', 'treasurer@local.khwwc.test')->value('id');
        DB::table('book_balance')->updateOrInsert(
            ['id' => 'LOCAL-DEMO-BOOK-BALANCE'],
            [
                'transaction_date' => $now->toDateString(),
                'check_number' => 'LOCAL-DEMO-BOOK-01',
                'debit' => 0,
                'book_balance' => 6895000,
                'reason' => 'Seeded local demo opening balance',
                'created_by' => $treasurerId,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );
    }

    private function userIdForEmail(string $email): string
    {
        $existing = DB::table('auth_users')->where('email', $email)->value('id');

        return $existing ?: (string) Str::uuid();
    }
}
