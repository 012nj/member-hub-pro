<?php

namespace Tests\Feature\Payments;

use App\Services\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PaymentAtomicityTest extends TestCase
{
    use RefreshDatabase;

    protected array $adminHeaders = [];

    protected function setUp(): void
    {
        parent::setUp();

        $adminToken = JwtService::encode(JwtService::buildPayload(
            '05ade1a2-2aba-425c-b298-3b27f1d2c13b',
            '254712345678@welfare.local',
            ['member', 'admin', 'super_admin']
        ));
        $this->adminHeaders = ['Authorization' => "Bearer {$adminToken}"];
    }

    private function createMember(): string
    {
        $memberId = \App\Support\Uuid::v4();

        DB::table('members')->insert([
            'id' => $memberId,
            'user_id' => $memberId,
            'name' => 'Atomicity Test Member',
            'phone' => '+2547' . substr($memberId, 0, 8),
            'member_id' => 'AT' . $memberId,
            'is_active' => 1,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $memberId;
    }

    public function test_legacy_stk_callback_does_not_mutate_fund_drive_payment(): void
    {
        $memberId = $this->createMember();

        $campaignId = \App\Support\Uuid::v4();
        DB::table('donation_campaigns')->insert([
            'id' => $campaignId,
            'title' => 'Atomic Test Drive',
            'description' => 'Atomic test',
            'amount' => 1000,
            'active' => 1,
            'goal_type' => 'fixed',
            'target_total' => 5000,
            'allow_partial' => 1,
            'total_collected' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $recordId = \App\Support\Uuid::v4();
        $checkoutId = 'ws_CO_ATOMIC_TEST';

        DB::table('donation_payment_records')->insert([
            'id' => $recordId,
            'campaign_id' => $campaignId,
            'member_id' => $memberId,
            'amount' => 50,
            'status' => 'pending',
            'mpesa_transaction_id' => $checkoutId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->postJson('/api/payments/stk-callback', [
            'Body' => [
                'stkCallback' => [
                    'MerchantRequestID' => 'atomic-merchant',
                    'CheckoutRequestID' => $checkoutId,
                    'ResultCode' => 0,
                    'ResultDesc' => 'Success',
                    'CallbackMetadata' => [
                        'Item' => [
                            ['Name' => 'MpesaReceiptNumber', 'Value' => 'ATOMIC_RECPT'],
                        ],
                    ],
                ],
            ],
        ]);

        $response->assertOk()->assertJsonPath('status', 'ignored');
        $this->assertEquals('pending', DB::table('donation_payment_records')
            ->where('id', $recordId)->value('status'));

        $this->assertEquals(0, (float) DB::table('donation_campaigns')
            ->where('id', $campaignId)->value('total_collected'));

        $this->assertDatabaseMissing('wallet_transactions', [
            'wallet_type' => 'donation',
            'direction' => 'credit',
            'reference_id' => $recordId,
        ]);
    }

    public function test_legacy_stk_callbacks_do_not_mutate_payment_types(): void
    {
        $memberId = $this->createMember();

        // Monthly Contribution
        $contributionId = \App\Support\Uuid::v4();
        DB::table('contributions')->insert([
            'id' => $contributionId,
            'member_id' => $memberId,
            'amount' => 300,
            'month' => (int) now()->format('n'),
            'year' => (int) now()->format('Y'),
            'due_date' => now()->format('Y-m-d'),
            'status' => 'pending',
            'stk_checkout_request_id' => 'ws_CO_CONTRIB_001',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Penalty
        $penaltyId = \App\Support\Uuid::v4();
        DB::table('penalty_payment_records')->insert([
            'id' => $penaltyId,
            'member_id' => $memberId,
            'amount' => 500,
            'status' => 'pending',
            'mpesa_transaction_id' => 'ws_CO_PENALTY_001',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Fund Drive
        $campaignId = \App\Support\Uuid::v4();
        DB::table('donation_campaigns')->insert([
            'id' => $campaignId,
            'title' => 'Separate Flows Test',
            'description' => 'Test',
            'amount' => 1000,
            'active' => 1,
            'goal_type' => 'fixed',
            'target_total' => 5000,
            'allow_partial' => 1,
            'total_collected' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $donationId = \App\Support\Uuid::v4();
        DB::table('donation_payment_records')->insert([
            'id' => $donationId,
            'campaign_id' => $campaignId,
            'member_id' => $memberId,
            'amount' => 100,
            'status' => 'pending',
            'mpesa_transaction_id' => 'ws_CO_DONATION_001',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Process all three callbacks
        $contributionResponse = $this->postJson('/api/payments/stk-callback', [
            'Body' => [
                'stkCallback' => [
                    'MerchantRequestID' => 'sep-1',
                    'CheckoutRequestID' => 'ws_CO_CONTRIB_001',
                    'ResultCode' => 0,
                    'ResultDesc' => 'Success',
                    'CallbackMetadata' => [
                        'Item' => [
                            ['Name' => 'MpesaReceiptNumber', 'Value' => 'SEP_CONTRIB'],
                        ],
                    ],
                ],
            ],
        ]);

        $penaltyResponse = $this->postJson('/api/payments/stk-callback', [
            'Body' => [
                'stkCallback' => [
                    'MerchantRequestID' => 'sep-2',
                    'CheckoutRequestID' => 'ws_CO_PENALTY_001',
                    'ResultCode' => 0,
                    'ResultDesc' => 'Success',
                    'CallbackMetadata' => [
                        'Item' => [
                            ['Name' => 'MpesaReceiptNumber', 'Value' => 'SEP_PENALTY'],
                        ],
                    ],
                ],
            ],
        ]);

        $donationResponse = $this->postJson('/api/payments/stk-callback', [
            'Body' => [
                'stkCallback' => [
                    'MerchantRequestID' => 'sep-3',
                    'CheckoutRequestID' => 'ws_CO_DONATION_001',
                    'ResultCode' => 0,
                    'ResultDesc' => 'Success',
                    'CallbackMetadata' => [
                        'Item' => [
                            ['Name' => 'MpesaReceiptNumber', 'Value' => 'SEP_DONATION'],
                        ],
                    ],
                ],
            ],
        ]);

        $contributionResponse->assertOk()->assertJsonPath('status', 'ignored');
        $penaltyResponse->assertOk()->assertJsonPath('status', 'ignored');
        $donationResponse->assertOk()->assertJsonPath('status', 'ignored');

        $this->assertEquals('pending', DB::table('contributions')
            ->where('id', $contributionId)->value('status'));
        $this->assertEquals('pending', DB::table('penalty_payment_records')
            ->where('mpesa_transaction_id', 'ws_CO_PENALTY_001')->value('status'));
        $this->assertEquals('pending', DB::table('donation_payment_records')
            ->where('mpesa_transaction_id', 'ws_CO_DONATION_001')->value('status'));
        $this->assertEquals(0, (float) DB::table('donation_campaigns')
            ->where('id', $campaignId)->value('total_collected'));
        $this->assertSame(0, DB::table('wallet_transactions')
            ->whereIn('mpesa_receipt', ['SEP_CONTRIB', 'SEP_PENALTY', 'SEP_DONATION'])
            ->count());
    }

    public function test_failed_legacy_stk_callback_is_ignored_until_status_poll(): void
    {
        $memberId = $this->createMember();

        $campaignId = \App\Support\Uuid::v4();
        DB::table('donation_campaigns')->insert([
            'id' => $campaignId,
            'title' => 'Atomicity Failure Drive',
            'description' => 'Test',
            'amount' => 500,
            'active' => 1,
            'goal_type' => 'fixed',
            'target_total' => 5000,
            'allow_partial' => 1,
            'total_collected' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $recordId = \App\Support\Uuid::v4();
        $checkoutId = 'ws_CO_ATOMIC_FAIL';

        DB::table('donation_payment_records')->insert([
            'id' => $recordId,
            'campaign_id' => $campaignId,
            'member_id' => $memberId,
            'amount' => 50,
            'status' => 'pending',
            'mpesa_transaction_id' => $checkoutId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $initialCollected = (float) DB::table('donation_campaigns')
            ->where('id', $campaignId)
            ->value('total_collected');

        $response = $this->postJson('/api/payments/stk-callback', [
            'Body' => [
                'stkCallback' => [
                    'MerchantRequestID' => 'atomic-fail-merchant',
                    'CheckoutRequestID' => $checkoutId,
                    'ResultCode' => 1,
                    'ResultDesc' => 'Insufficient balance',
                    'CallbackMetadata' => [
                        'Item' => [],
                    ],
                ],
            ],
        ]);

        $record = DB::table('donation_payment_records')->where('id', $recordId)->first();
        $collected = (float) DB::table('donation_campaigns')
            ->where('id', $campaignId)
            ->value('total_collected');

        $response->assertOk()->assertJsonPath('status', 'ignored');
        $this->assertEquals('pending', $record->status, 'Status polling remains authoritative');
        $this->assertEquals($initialCollected, $collected, 'An ignored callback cannot change campaign totals');

        $walletTxCount = DB::table('wallet_transactions')
            ->where('mpesa_receipt', 'ATOMIC_FAIL_RECPT')
            ->count();
        $this->assertEquals(0, $walletTxCount, 'No wallet transaction created on failed callback');

        $campaignContribution = DB::table('campaign_contributions')
            ->where('campaign_id', $campaignId)
            ->where('member_id', $memberId)
            ->first();
        $this->assertNull($campaignContribution, 'No campaign_contribution on failed callback');
    }
}
