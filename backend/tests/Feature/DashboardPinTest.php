<?php

namespace Tests\Feature;

use App\Services\JwtService;
use App\Support\Uuid;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DashboardPinTest extends TestCase
{
    use RefreshDatabase;

    private string $userId = '33333333-3333-4333-8333-333333333333';

    private function token(bool $pinVerified = false, array $roles = ['treasurer']): string
    {
        return JwtService::encode(array_merge(
            JwtService::buildPayload($this->userId, 'treasurer@test.local', $roles),
            ['pin_verified' => $pinVerified]
        ));
    }

    private function createUser(array $roles = ['treasurer']): void
    {
        DB::table('auth_users')->insert([
            'id' => $this->userId,
            'email' => 'treasurer@test.local',
            'phone' => '+254700000003',
            'encrypted_password' => password_hash('SafePassword123', PASSWORD_BCRYPT),
            'is_banned' => 0,
            'must_change_password' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ($roles as $role) {
            DB::table('user_roles')->insert([
                'id' => Uuid::v4(),
                'user_id' => $this->userId,
                'role' => $role,
                'is_active' => 1,
            ]);
        }
    }

    public function test_role_dashboard_requires_pin_before_protected_api_access(): void
    {
        $this->createUser();
        $token = $this->token();

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertForbidden()
            ->assertJsonPath('error.code', 'pin_required');

        $legacyToken = JwtService::encode(
            JwtService::buildPayload($this->userId, 'treasurer@test.local', ['treasurer'])
        );
        $this->withToken($legacyToken)
            ->getJson('/api/auth/me')
            ->assertForbidden()
            ->assertJsonPath('error.code', 'pin_required');

        $this->withToken($token)
            ->getJson('/api/auth/dashboard-pin/status')
            ->assertOk()
            ->assertJson(['required' => true, 'configured' => false, 'verified' => false]);
    }

    public function test_staff_can_set_a_pin_once_and_receive_a_verified_session(): void
    {
        $this->createUser();

        $response = $this->withToken($this->token())
            ->postJson('/api/auth/dashboard-pin/verify', [
                'pin' => '1234',
                'pin_confirmation' => '1234',
            ])
            ->assertOk()
            ->assertJsonPath('verified', true);

        $this->assertDatabaseHas('dashboard_security', ['user_id' => $this->userId]);
        $storedHash = (string) DB::table('dashboard_security')->where('user_id', $this->userId)->value('pin_hash');
        $this->assertTrue(password_verify('1234', $storedHash));

        $this->withToken($response->json('access_token'))
            ->getJson('/api/auth/me')
            ->assertOk();
    }

    public function test_staff_pin_must_match_before_issuing_a_verified_session(): void
    {
        $this->createUser();
        DB::table('dashboard_security')->insert([
            'id' => Uuid::v4(),
            'user_id' => $this->userId,
            'pin_hash' => password_hash('1234', PASSWORD_DEFAULT),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withToken($this->token())
            ->postJson('/api/auth/dashboard-pin/verify', ['pin' => '9999'])
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'invalid_pin');

        $this->withToken($this->token())
            ->postJson('/api/auth/dashboard-pin/verify', ['pin' => '1234'])
            ->assertOk()
            ->assertJsonPath('verified', true);
    }

    public function test_member_roles_do_not_require_a_dashboard_pin(): void
    {
        $this->createUser(['member']);

        $this->withToken($this->token(false, ['member']))
            ->getJson('/api/auth/dashboard-pin/status')
            ->assertOk()
            ->assertJson(['required' => false, 'configured' => false, 'verified' => true]);

        $this->withToken($this->token(false, ['member']))
            ->getJson('/api/auth/me')
            ->assertOk();
    }
}
