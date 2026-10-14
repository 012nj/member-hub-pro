<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\HttpException;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Reusable meeting-minute templates used to pre-fill the minutes form. */
class MinuteTemplateController extends Controller
{
    private const ROLES = ['secretary', 'vice_secretary', 'vice-secretary', 'chairperson', 'admin', 'super_admin'];

    private function identity(Request $request): array
    {
        $identity = $request->attributes->get('identity');
        if (! is_array($identity) || empty($identity['user_id'])) {
            throw new HttpException(401, 'invalid_token', 'Authentication required.');
        }
        if (! array_intersect(self::ROLES, array_map('strval', (array) ($identity['roles'] ?? [])))) {
            throw new HttpException(403, 'forbidden', 'Only officers can manage minute templates.');
        }

        return $identity;
    }

    private function rules(): array
    {
        return [
            'name' => 'required|string|max:150',
            'meeting_type' => 'required|in:general,executive',
            'title' => 'nullable|string|max:200',
            'agenda' => 'nullable|string|max:20000',
            'discussions' => 'nullable|string|max:50000',
            'decisions' => 'nullable|string|max:20000',
            'action_items' => 'nullable|string|max:20000',
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $this->identity($request);

        return response()->json(DB::table('minute_templates')->orderByDesc('is_default')->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $identity = $this->identity($request);
        $data = $request->validate($this->rules());
        $id = (string) Str::uuid();
        DB::table('minute_templates')->insert($data + [
            'id' => $id, 'is_default' => false, 'created_by' => $identity['user_id'],
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return response()->json(['data' => DB::table('minute_templates')->where('id', $id)->first()], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $this->identity($request);
        $data = $request->validate($this->rules());
        $updated = DB::table('minute_templates')->where('id', $id)->update($data + ['updated_at' => now()]);
        if (! $updated && ! DB::table('minute_templates')->where('id', $id)->exists()) {
            throw new HttpException(404, 'not_found', 'Template not found.');
        }

        return response()->json(['data' => DB::table('minute_templates')->where('id', $id)->first()]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->identity($request);
        DB::table('minute_templates')->where('id', $id)->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
