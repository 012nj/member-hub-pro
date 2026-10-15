<?php

namespace Tests\Feature\Payments;

use App\Support\Uuid;
use App\Exceptions\CoopBankException;
use App\Services\CoopBank\CoopBankAccountService;
use App\Services\CoopBank\CoopBankTransactionService;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    private function uniqueEmail(): string
    {
        return 'test-pay-'.Uuid::v4().'@welfare.local';
    }

    private function uniquePhone(): string
    {
        return '+2547'.substr(Uuid::v4(), 0, 8);
    }

    private function authHeader(string $role = 'admin'): array
    {
        $userId = Uuid::v4();
        $email = $this->uniqueEmail();
        $phone = $this->uniquePhone();

        DB::table('auth_users')->insert([
            'id' => $userId,
            'email' => $email,
            'encrypted_password' => password_hash('password', PASSWORD_BCRYPT),
            'is_banned' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('user_roles')->insert([
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'role' => $role,
            'is_active' => 1,
        ]);

        DB::table('members')->insert([
            'id' => $userId,
            'user_id' => $userId,
            'name' => 'Pay Test User',
            'phone' => $phone,
            'member_id' => 'PAY'.Uuid::v4(),
            'is_active' => 1,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $token = \App\Services\AuthService::issueSession([
            'id' => $userId,
            'email' => $email,
        ])['access_token'];

        return ['Authorization' => 'Bearer '.$token];
    }

    private function memberIdForLatestPhone(): string
    {
        return DB::table('members')->orderByDesc('id')->value('id');
    }

    private function createDashboardMember(): string
    {
        $memberId = Uuid::v4();
        $email = $this->uniqueEmail();
        $phone = $this->uniquePhone();
        DB::table('auth_users')->insert([
            'id' => $memberId,
            'email' => $email,
            'phone' => $phone,
            'encrypted_password' => password_hash('password', PASSWORD_BCRYPT),
            'is_banned' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('members')->insert([
            'id' => $memberId,
            'user_id' => $memberId,
            'name' => 'Dashboard Contract Member',
            'phone' => $phone,
            'member_id' => 'DASH'.substr($memberId, 0, 8),
            'is_active' => 1,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $memberId;
    }

    public function test_stk_push_creates_pending_payment_record(): void
    {
        $headers = $this->authHeader();
        $memberId = $this->memberIdForLatestPhone();

        $response = $this->postJson('/api/payments/stk-push', [
            'member_id' => $memberId,
            'amount' => 150,
            'phone' => '254712345678',
            'accountReference' => 'PENALTY-TEST',
            'transactionDesc' => 'Test penalty',
            'paymentType' => 'penalty',
        ], $headers);

        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'checkoutRequestId', 'message'])
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('penalty_payment_records', [
            'status' => 'pending',
        ]);
    }

    public function test_stk_push_requires_auth(): void
    {
        $response = $this->postJson('/api/payments/stk-push', [
            'member_id' => 'test',
            'amount' => 150,
            'phone' => '254712345678',
            'paymentType' => 'penalty',
        ]);

        $response->assertStatus(401);
    }

    public function test_immediate_stk_rejection_marks_canonical_and_monthly_records_failed(): void
    {
        $headers = $this->authHeader();
        $memberId = $this->memberIdForLatestPhone();
        $bank = Mockery::mock(CoopBankTransactionService::class);
        $bank->shouldReceive('initiateStkPush')
            ->once()
            ->andThrow(new CoopBankException('Bank rejected the STK request', 'stk_error', '4001'));
        $this->app->instance(CoopBankTransactionService::class, $bank);

        $response = $this->postJson('/api/payments/stk-push', [
            'member_id' => $memberId,
            'amount' => 300,
            'phone' => '254712345678',
            'paymentType' => 'monthly_contribution',
        ], $headers);

        $response->assertStatus(422)->assertJson([
            'success' => false,
            'message' => 'Bank rejected the STK request',
        ]);
        $this->assertDatabaseHas('payments', [
            'member_id' => $memberId,
            'payment_type' => 'monthly_contribution',
            'status' => 'failed',
        ]);
        $this->assertDatabaseHas('contributions', [
            'member_id' => $memberId,
            'status' => 'failed',
        ]);
    }

    public function test_legacy_stk_callback_is_a_noop_for_pending_canonical_payment(): void
    {
        $headers = $this->authHeader();
        $memberId = $this->memberIdForLatestPhone();

        $pushResponse = $this->postJson('/api/payments/stk-push', [
            'member_id' => $memberId,
            'amount' => 300,
            'phone' => '254712345678',
            'paymentType' => 'monthly_contribution',
        ], $headers);

        $checkoutId = $pushResponse->json('checkoutRequestId');
        $paymentId = $pushResponse->json('payment_id');
        $before = [
            'payments' => DB::table('payments')->count(),
            'allocations' => DB::table('contribution_allocations')->count(),
            'contributions' => DB::table('contributions')->where('member_id', $memberId)->count(),
            'wallet_transactions' => DB::table('wallet_transactions')->count(),
            'total_contributions' => DB::table('members')->where('id', $memberId)->value('total_contributions'),
        ];

        $this->postJson('/api/payments/stk-callback', [
            'Body' => [
                'stkCallback' => [
                    'CheckoutRequestID' => $checkoutId,
                    'ResultCode' => 0,
                    'CallbackMetadata' => [
                        'Item' => [
                            ['Name' => 'Amount', 'Value' => 300],
                            ['Name' => 'MpesaReceiptNumber', 'Value' => 'STALE-CALLBACK'],
                        ],
                    ],
                ],
            ],
        ])->assertOk()->assertJson([
            'success' => true,
            'status' => 'ignored',
        ]);

        $this->assertSame($before['payments'], DB::table('payments')->count());
        $this->assertSame($before['allocations'], DB::table('contribution_allocations')->count());
        $this->assertSame($before['contributions'], DB::table('contributions')->where('member_id', $memberId)->count());
        $this->assertSame($before['wallet_transactions'], DB::table('wallet_transactions')->count());
        $this->assertSame($before['total_contributions'], DB::table('members')->where('id', $memberId)->value('total_contributions'));
        $this->assertSame('pending', DB::table('payments')->where('id', $paymentId)->value('status'));
    }

    public function test_stk_callback_does_not_update_payment_status(): void
    {
        $headers = $this->authHeader();
        $memberId = $this->memberIdForLatestPhone();

        $pushResponse = $this->postJson('/api/payments/stk-push', [
            'member_id' => $memberId,
            'amount' => 150,
            'phone' => '254712345678',
            'paymentType' => 'penalty',
        ], $headers);

        $checkoutId = $pushResponse->json('checkoutRequestId');

        $callbackResponse = $this->postJson('/api/payments/stk-callback', [
            'Body' => [
                'stkCallback' => [
                    'MerchantRequestID' => 'test-123',
                    'CheckoutRequestID' => $checkoutId,
                    'ResultCode' => 0,
                    'ResultDesc' => 'Success',
                    'CallbackMetadata' => [
                        'Item' => [
                            ['Name' => 'Amount', 'Value' => 150],
                            ['Name' => 'MpesaReceiptNumber', 'Value' => 'SGK'.rand(1000, 9999)],
                            ['Name' => 'TransactionDate', 'Value' => (int) now()->format('YmdHis')],
                        ],
                    ],
                ],
            ],
        ]);

        $callbackResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('penalty_payment_records', [
            'mpesa_transaction_id' => $checkoutId,
            'status' => 'pending',
        ]);
    }

    public function test_payment_status_returns_correct_status(): void
    {
        $headers = $this->authHeader();
        $memberId = $this->memberIdForLatestPhone();

        $pushResponse = $this->postJson('/api/payments/stk-push', [
            'member_id' => $memberId,
            'amount' => 150,
            'phone' => '254712345678',
            'paymentType' => 'penalty',
        ], $headers);

        $checkoutId = $pushResponse->json('checkoutRequestId');

        $statusResponse = $this->getJson("/api/payments/status/{$checkoutId}", $headers);

        $statusResponse->assertStatus(200)
            ->assertJsonStructure(['status', 'amount'])
            ->assertJson(['status' => 'pending']);
    }

    public function test_temporary_bank_status_error_returns_retryable_pending_status(): void
    {
        $headers = $this->authHeader();
        $memberId = $this->memberIdForLatestPhone();
        $pushResponse = $this->postJson('/api/payments/stk-push', [
            'member_id' => $memberId,
            'amount' => 150,
            'phone' => '254712345678',
            'paymentType' => 'penalty',
        ], $headers);
        $checkoutId = $pushResponse->json('checkoutRequestId');

        $accountService = Mockery::mock(CoopBankAccountService::class);
        $accountService->shouldReceive('queryStkStatus')
            ->once()
            ->andThrow(new CoopBankException('Bank enquiry temporarily unavailable', 'connection_error'));
        $this->app->instance(CoopBankAccountService::class, $accountService);

        $this->getJson("/api/payments/status/{$checkoutId}", $headers)
            ->assertOk()
            ->assertJson([
                'success' => false,
                'status' => 'pending',
                'final' => false,
            ]);
    }

    public function test_treasurer_dashboard_exposes_all_displayed_balance_metrics(): void
    {
        $headers = $this->authHeader('treasurer');

        $this->getJson('/api/treasurer/dashboard', $headers)
            ->assertOk()
            ->assertJsonStructure([
                'operational_balance',
                'contributions_balance',
                'penalty_balance',
                'donation_balance',
                'book_balance',
                'bank_balance',
                'reconciliation_diff',
                'pending_withdrawals',
                'pending_expenses',
                'monthly_contributions',
            ]);
    }

    public function test_treasurer_contributions_are_returned_in_dashboard_display_shape(): void
    {
        $headers = $this->authHeader('treasurer');
        $memberId = $this->createDashboardMember();
        $contributionId = Uuid::v4();
        DB::table('contributions')->insert([
            'id' => $contributionId,
            'member_id' => $memberId,
            'amount' => 300,
            'month' => (int) now()->format('n'),
            'year' => (int) now()->format('Y'),
            'due_date' => now()->format('Y-m-d'),
            'paid_date' => now()->format('Y-m-d'),
            'payment_ref' => 'LOCAL-DASHBOARD-CONTRIBUTION',
            'status' => 'paid',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->getJson('/api/treasurer/contributions?page=1', $headers)
            ->assertOk()
            ->assertJsonPath('data.0.id', $contributionId)
            ->assertJsonPath('data.0.member_name', 'Dashboard Contract Member')
            ->assertJsonPath('data.0.type', 'monthly')
            ->assertJsonPath('data.0.status', 'confirmed')
            ->assertJsonPath('data.0.method', 'mpesa')
            ->assertJsonPath('data.0.reference', 'LOCAL-DASHBOARD-CONTRIBUTION')
            ->assertJsonPath('data.0.period', now()->format('Y-m'));
    }

    public function test_treasurer_bank_statement_includes_dashboard_display_fields(): void
    {
        $headers = $this->authHeader('treasurer');
        $memberId = $this->createDashboardMember();
        $reference = 'LOCAL-DASHBOARD-BANK-'.Uuid::v4();
        DB::table('bank_transactions')->insert([
            'id' => Uuid::v4(),
            'bank_name' => 'coop',
            'member_id' => $memberId,
            'phone' => '+254712345678',
            'amount' => 450,
            'transaction_date' => now()->format('Y-m-d'),
            'month' => (int) now()->format('n'),
            'year' => (int) now()->format('Y'),
            'transaction_reference' => $reference,
            'bank_transaction_reference' => $reference,
            'transaction_type' => 'credit',
            'credit_amount' => 450,
            'debit_amount' => 0,
            'narration' => 'Test bank contribution',
            'reconciliation_status' => 'matched',
            'created_at' => now(),
        ]);

        $this->getJson('/api/treasurer/bank-statement?page=1', $headers)
            ->assertOk()
            ->assertJsonPath('data.0.reference', $reference)
            ->assertJsonPath('data.0.description', 'Test bank contribution')
            ->assertJsonPath('data.0.amount', 450)
            ->assertJsonPath('data.0.type', 'credit')
            ->assertJsonPath('data.0.matched', true);
    }

    public function test_bank_sync_requires_staff(): void
    {
        $memberId = $this->memberIdForLatestPhone();
        $email = DB::table('auth_users')->where('id', $memberId)->value('email');

        DB::table('user_roles')->where('user_id', $memberId)->update(['role' => 'member']);

        $token = \App\Services\AuthService::issueSession([
            'id' => $memberId,
            'email' => $email,
        ])['access_token'];

        $response = $this->postJson('/api/payments/bank-sync', [
            'from_date' => '2024-01-01',
            'to_date' => '2024-01-31',
        ], ['Authorization' => 'Bearer '.$token]);

        $response->assertStatus(403);
    }

    public function test_bank_sync_returns_transactions_for_staff(): void
    {
        $headers = $this->authHeader();

        $response = $this->postJson('/api/payments/bank-sync', [
            'from_date' => '2024-01-01',
            'to_date' => '2024-12-31',
        ], $headers);

        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'transactions'])
            ->assertJson(['success' => true]);
    }

    public function test_monthly_contribution_stk_push_creates_pending_contribution(): void
    {
        $headers = $this->authHeader();
        $memberId = $this->memberIdForLatestPhone();

        $response = $this->postJson('/api/payments/stk-push', [
            'member_id' => $memberId,
            'amount' => 300,
            'phone' => '254712345678',
            'accountReference' => 'CONTRIBUTION-'.$memberId,
            'transactionDesc' => 'Monthly contribution',
            'paymentType' => 'monthly_contribution',
        ], $headers);

        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'checkoutRequestId', 'message'])
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('contributions', [
            'member_id' => $memberId,
            'status' => 'pending',
        ]);
    }

    public function test_monthly_contribution_callback_does_not_mark_contribution_paid(): void
    {
        $headers = $this->authHeader();
        $memberId = $this->memberIdForLatestPhone();

        $pushResponse = $this->postJson('/api/payments/stk-push', [
            'member_id' => $memberId,
            'amount' => 300,
            'phone' => '254712345678',
            'accountReference' => 'CONTRIBUTION-'.$memberId,
            'transactionDesc' => 'Monthly contribution',
            'paymentType' => 'monthly_contribution',
        ], $headers);

        $checkoutId = $pushResponse->json('checkoutRequestId');

        $callbackResponse = $this->postJson('/api/payments/stk-callback', [
            'Body' => [
                'stkCallback' => [
                    'MerchantRequestID' => 'test-monthly-123',
                    'CheckoutRequestID' => $checkoutId,
                    'ResultCode' => 0,
                    'ResultDesc' => 'Success',
                    'CallbackMetadata' => [
                        'Item' => [
                            ['Name' => 'Amount', 'Value' => 300],
                            ['Name' => 'MpesaReceiptNumber', 'Value' => 'MKT'.rand(1000, 9999)],
                            ['Name' => 'TransactionDate', 'Value' => (int) now()->format('YmdHis')],
                        ],
                    ],
                ],
            ],
        ]);

        $callbackResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('contributions', [
            'member_id' => $memberId,
            'status' => 'pending',
        ]);
    }

    public function test_monthly_contribution_does_not_credit_wallet(): void
    {
        $headers = $this->authHeader();
        $memberId = $this->memberIdForLatestPhone();

        $pushResponse = $this->postJson('/api/payments/stk-push', [
            'member_id' => $memberId,
            'amount' => 300,
            'phone' => '254712345678',
            'accountReference' => 'CONTRIBUTION-'.$memberId,
            'transactionDesc' => 'Monthly contribution',
            'paymentType' => 'monthly_contribution',
        ], $headers);

        $checkoutId = $pushResponse->json('checkoutRequestId');

        $this->postJson('/api/payments/stk-callback', [
            'Body' => [
                'stkCallback' => [
                    'MerchantRequestID' => 'test-monthly-no-wallet',
                    'CheckoutRequestID' => $checkoutId,
                    'ResultCode' => 0,
                    'ResultDesc' => 'Success',
                    'CallbackMetadata' => [
                        'Item' => [
                            ['Name' => 'Amount', 'Value' => 300],
                            ['Name' => 'MpesaReceiptNumber', 'Value' => 'MKT'.rand(1000, 9999)],
                            ['Name' => 'TransactionDate', 'Value' => (int) now()->format('YmdHis')],
                        ],
                    ],
                ],
            ],
        ]);

        $this->assertDatabaseMissing('wallet_transactions', [
            'wallet_type' => 'donation_wallet',
        ]);
        $this->assertDatabaseMissing('wallet_transactions', [
            'wallet_type' => 'penalty_wallet',
        ]);
        $this->assertDatabaseMissing('wallet_transactions', [
            'wallet_type' => 'operational_wallet',
        ]);
    }

    public function test_operational_stk_callback_does_not_credit_operational_wallet(): void
    {
        $headers = $this->authHeader();
        $memberId = $this->memberIdForLatestPhone();

        $pushResponse = $this->postJson('/api/payments/stk-push', [
            'member_id' => $memberId,
            'amount' => 500,
            'phone' => '254712345678',
            'accountReference' => 'OP-TOPPER',
            'transactionDesc' => 'Operational top-up',
            'paymentType' => 'operational',
        ], $headers);

        $checkoutId = $pushResponse->json('checkoutRequestId');

        $callbackResponse = $this->postJson('/api/payments/stk-callback', [
            'Body' => [
                'stkCallback' => [
                    'MerchantRequestID' => 'test-operational-123',
                    'CheckoutRequestID' => $checkoutId,
                    'ResultCode' => 0,
                    'ResultDesc' => 'Success',
                    'CallbackMetadata' => [
                        'Item' => [
                            ['Name' => 'Amount', 'Value' => 500],
                            ['Name' => 'MpesaReceiptNumber', 'Value' => 'OPR'.rand(1000, 9999)],
                            ['Name' => 'TransactionDate', 'Value' => (int) now()->format('YmdHis')],
                        ],
                    ],
                ],
            ],
        ]);

        $callbackResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('operational_payment_records', [
            'mpesa_transaction_id' => $checkoutId,
            'status' => 'pending',
        ]);

        $this->assertDatabaseMissing('wallet_transactions', [
            'wallet_type' => 'operational',
            'direction' => 'credit',
        ]);
    }

    public function test_reconcile_stk_requires_staff(): void
    {
        $memberId = $this->memberIdForLatestPhone();
        $email = DB::table('auth_users')->where('id', $memberId)->value('email');

        DB::table('user_roles')->where('user_id', $memberId)->update(['role' => 'member']);

        $token = \App\Services\AuthService::issueSession([
            'id' => $memberId,
            'email' => $email,
        ])['access_token'];

        $response = $this->postJson('/api/payments/reconcile-stk', [
            'from_date' => '2026-08-01',
            'to_date' => '2026-09-02',
        ], ['Authorization' => 'Bearer '.$token]);

        $response->assertStatus(403);
    }

    public function test_stk_status_1037_is_pending_not_failed(): void
    {
        $userId = Uuid::v4();
        $email = 'test-1037-'.Uuid::v4().'@welfare.local';
        $phone = '+2547'.substr(Uuid::v4(), 0, 8);

        DB::table('auth_users')->insert([
            'id' => $userId,
            'email' => $email,
            'encrypted_password' => password_hash('password', PASSWORD_BCRYPT),
            'is_banned' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('user_roles')->insert([
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'role' => 'admin',
            'is_active' => 1,
        ]);

        DB::table('members')->insert([
            'id' => $userId,
            'user_id' => $userId,
            'name' => '1037 Test User',
            'phone' => $phone,
            'member_id' => '1037'.Uuid::v4(),
            'is_active' => 1,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $token = \App\Services\AuthService::issueSession([
            'id' => $userId,
            'email' => $email,
        ])['access_token'];

        $headers = ['Authorization' => 'Bearer '.$token];

        $pushResponse = $this->postJson('/api/payments/stk-push', [
            'member_id' => $userId,
            'amount' => 300,
            'phone' => '254712345678',
            'accountReference' => 'CONTRIBUTION-'.$userId,
            'transactionDesc' => 'Monthly contribution',
            'paymentType' => 'monthly_contribution',
        ], $headers);

        $pushResponse->assertStatus(200)
            ->assertJsonStructure(['success', 'checkoutRequestId', 'message'])
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('contributions', [
            'member_id' => $userId,
            'status' => 'pending',
        ]);

        $checkoutId = $pushResponse->json('checkoutRequestId');

        $messageReference = 'STK'.gmdate('ymdHis').'1037';

        DB::table('coop_transfer_requests')->insert([
            'id' => \App\Support\Uuid::v4(),
            'message_reference' => $messageReference,
            'transfer_type' => 'STK',
            'status' => 'processing',
            'destination_account' => '254712345678',
            'amount' => 300,
            'currency' => 'KES',
            'narration_internal' => 'Test 1037',
            'narration_bank' => 'Test 1037',
            'internal_reference' => 'monthly_contribution-'.$userId.'-'.$checkoutId,
            'internal_table' => 'contributions',
            'request_payload' => json_encode(['test' => true]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $statusResponse = $this->getJson("/api/payments/status/{$checkoutId}", $headers);

        $statusResponse->assertStatus(200)
            ->assertJson(['status' => 'pending'])
            ->assertJson(['final' => false]);

        $this->assertDatabaseHas('contributions', [
            'member_id' => $userId,
            'status' => 'pending',
        ]);
    }
}
