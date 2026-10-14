<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AppearanceController extends PortalController
{
    public function show(Request $request): JsonResponse
    {
        $userId = $this->identity($request)['user_id'];
        $metadata = json_decode((string) DB::table('auth_users')->where('id', $userId)->value('raw_user_meta_data'), true);
        return response()->json($metadata['appearance'] ?? ['theme' => 'sky', 'paused' => false]);
    }

    public function update(Request $request): JsonResponse
    {
        $userId = $this->identity($request)['user_id'];
        $preferences = $request->validate([
            'theme' => 'required|string|in:sky,noir,lantern,ember,scarlet,moon',
            'paused' => 'required|boolean',
        ]);
        DB::transaction(function () use ($userId, $preferences) {
            $row = DB::table('auth_users')->where('id', $userId)->lockForUpdate()->first();
            $metadata = json_decode((string) ($row->raw_user_meta_data ?? '{}'), true);
            $metadata = is_array($metadata) ? $metadata : [];
            $metadata['appearance'] = $preferences;
            DB::table('auth_users')->where('id', $userId)->update([
                'raw_user_meta_data' => json_encode($metadata), 'updated_at' => now(),
            ]);
        });
        return response()->json($preferences);
    }
}