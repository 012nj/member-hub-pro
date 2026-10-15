<?php

namespace App\Http\Controllers;

use App\Models\PushToken;
use App\Services\Cache\CacheService;
use App\Services\NotificationService;
use App\Support\Uuid;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class NotificationController extends Controller
{
    public function __construct(private NotificationService $notifications, private CacheService $cache) {}

    public function bulkSms(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phones' => ['required', 'array', 'min:1'],
            'phones.*' => ['string', 'max:20'],
            'message' => ['required', 'string', 'max:1600'],
        ]);

        $result = $this->notifications->sendBulkSms($data['phones'], $data['message']);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function push(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:1000'],
            'tokens' => ['required', 'array', 'min:1'],
            'tokens.*' => ['string'],
        ]);

        $result = $this->notifications->sendPush($data['title'], $data['body'], $data['tokens']);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function registerDevice(Request $request): JsonResponse
    {
        $this->ensurePushTokenTable();

        $identity = $request->attributes->get('identity', []);
        $userId = (string) ($identity['user_id'] ?? '');

        if ($userId === '') {
            return response()->json(['success' => false, 'message' => 'Authentication required.'], 401);
        }

        $data = $request->validate([
            'token' => ['required', 'string', 'min:10', 'max:512'],
            'platform' => ['nullable', 'string', 'max:32'],
            'user_agent' => ['nullable', 'string', 'max:255'],
        ]);

        $token = trim($data['token']);
        $platform = trim((string) ($data['platform'] ?? 'web')) ?: 'web';
        $userAgent = trim((string) ($data['user_agent'] ?? '')) ?: null;

        $existing = DB::table('push_tokens')->where('token', $token)->first();
        if ($existing && (string) $existing->user_id !== $userId) {
            DB::table('push_tokens')->where('token', $token)->delete();
            $existing = null;
        }

        if ($existing) {
            DB::table('push_tokens')->where('id', $existing->id)->update([
                'user_id' => $userId,
                'platform' => $platform,
                'user_agent' => $userAgent,
                'updated_at' => now(),
            ]);
        } else {
            DB::table('push_tokens')->insert([
                'id' => Uuid::v4(),
                'user_id' => $userId,
                'token' => $token,
                'platform' => $platform,
                'user_agent' => $userAgent,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $device = DB::table('push_tokens')->where('token', $token)->first();

        return response()->json([
            'success' => true,
            'device' => [
                'id' => $device?->id,
                'user_id' => $device?->user_id,
                'token' => $device?->token,
                'platform' => $device?->platform,
                'user_agent' => $device?->user_agent,
                'updated_at' => $device?->updated_at,
            ],
        ]);
    }

    public function listDevices(Request $request): JsonResponse
    {
        $this->ensurePushTokenTable();

        $identity = $request->attributes->get('identity', []);
        $userId = (string) ($identity['user_id'] ?? '');

        if ($userId === '') {
            return response()->json(['devices' => []], 401);
        }

        $devices = PushToken::query()
            ->where('user_id', $userId)
            ->orderByDesc('updated_at')
            ->get(['id', 'user_id', 'token', 'platform', 'user_agent', 'updated_at'])
            ->map(fn ($device) => [
                'id' => $device->id,
                'user_id' => $device->user_id,
                'token' => $device->token,
                'platform' => $device->platform,
                'user_agent' => $device->user_agent,
                'updated_at' => $device->updated_at,
            ])
            ->all();

        return response()->json(['devices' => $devices]);
    }

    public function removeDevice(Request $request, string $token): JsonResponse
    {
        $this->ensurePushTokenTable();

        $identity = $request->attributes->get('identity', []);
        $userId = (string) ($identity['user_id'] ?? '');

        if ($userId === '') {
            return response()->json(['success' => false, 'message' => 'Authentication required.'], 401);
        }

        $deleted = PushToken::query()
            ->where('user_id', $userId)
            ->where('token', trim($token))
            ->delete();

        return response()->json(['success' => true, 'deleted' => $deleted > 0]);
    }

    private function ensurePushTokenTable(): void
    {
        if (Schema::hasTable('push_tokens')) {
            return;
        }

        DB::statement('CREATE TABLE IF NOT EXISTS push_tokens (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            token VARCHAR(255) NOT NULL UNIQUE,
            platform TEXT DEFAULT NULL,
            user_agent TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )');

        DB::statement('CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens (user_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_push_tokens_created_at ON push_tokens (created_at)');
    }

    public function unseenEventCount(Request $request): JsonResponse
    {
        $identity = $request->attributes->get('identity');
        $lastSeenAt = $request->query('last_seen_at');

        $key = $lastSeenAt ? md5($lastSeenAt) : 'none';
        $userId = $identity['user_id'] ?? 'guest';

        $count = $this->cache->rememberUnseenEventCount($userId, $lastSeenAt, function () use ($lastSeenAt) {
            $query = DB::table('events');
            if ($lastSeenAt) {
                $query->where('created_at', '>', $lastSeenAt);
            }
            return $query->count();
        });

        return response()->json(['count' => (int) $count]);
    }

    public function unreadNotificationCount(Request $request): JsonResponse
    {
        $userId = $request->attributes->get('identity')['user_id'] ?? null;
        if (!$userId) {
            return response()->json(['count' => 0]);
        }

        $count = $this->cache->rememberUnreadNotificationCount($userId, function () use ($userId) {
            return DB::table('notifications')
                ->where('user_id', $userId)
                ->where('is_read', false)
                ->count();
        });

        return response()->json(['count' => (int) $count]);
    }

    public function unreadNewsCount(Request $request): JsonResponse
    {
        $userId = $request->attributes->get('identity')['user_id'] ?? null;
        if (!$userId) {
            return response()->json(['count' => 0]);
        }

        $count = $this->cache->rememberUnreadNewsCount($userId, function () use ($userId) {
            $readNews = DB::table('news_read')
                ->where('user_id', $userId)
                ->pluck('news_id')
                ->all();

            return DB::table('news')
                ->when(!empty($readNews), function ($query) use ($readNews) {
                    $query->whereNotIn('id', $readNews);
                })
                ->count();
        });

        return response()->json(['count' => (int) $count]);
    }
}
