<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('defaulter_actions')) {
            Schema::create('defaulter_actions', function (Blueprint $t) {
                $t->char('id', 36)->primary();
                $t->char('member_id', 36)->index();
                $t->string('action', 20); // suspend | activate | warning | reminder
                $t->text('message')->nullable();
                $t->string('reason', 500)->nullable();
                $t->char('performed_by', 36)->nullable();
                $t->timestamps();
                $t->index(['member_id', 'action']);
            });
        }

        if (! Schema::hasTable('minute_templates')) {
            Schema::create('minute_templates', function (Blueprint $t) {
                $t->char('id', 36)->primary();
                $t->string('name', 150);
                $t->string('meeting_type', 20)->default('general');
                $t->string('title', 200)->nullable();
                $t->text('agenda')->nullable();
                $t->text('discussions')->nullable();
                $t->text('decisions')->nullable();
                $t->text('action_items')->nullable();
                $t->boolean('is_default')->default(false);
                $t->char('created_by', 36)->nullable();
                $t->timestamps();
            });

            $now = now();
            DB::table('minute_templates')->insert([
                [
                    'id' => (string) Str::uuid(), 'name' => 'Monthly General Meeting', 'meeting_type' => 'general',
                    'title' => 'Monthly General Meeting',
                    'agenda' => "1. Opening prayer\n2. Reading and confirmation of previous minutes\n3. Matters arising\n4. Treasurer's report\n5. Welfare cases\n6. AOB\n7. Closing",
                    'discussions' => "MIN 01: Opening — \nMIN 02: Previous minutes — \nMIN 03: Matters arising — \nMIN 04: Treasurer's report — \nMIN 05: Welfare cases — \nMIN 06: AOB — ",
                    'decisions' => "1. \n2. ", 'action_items' => "Action — Owner — Due date\n1. ",
                    'is_default' => true, 'created_by' => null, 'created_at' => $now, 'updated_at' => $now,
                ],
                [
                    'id' => (string) Str::uuid(), 'name' => 'Executive Committee Meeting', 'meeting_type' => 'executive',
                    'title' => 'Executive Committee Meeting',
                    'agenda' => "1. Opening\n2. Confirmation of previous minutes\n3. Financial position & wallets\n4. Defaulters and penalties\n5. Payout approvals\n6. AOB",
                    'discussions' => "MIN 01: \nMIN 02: \nMIN 03: Financial position — \nMIN 04: Defaulters — \nMIN 05: Payouts — ",
                    'decisions' => "1. ", 'action_items' => "Action — Owner — Due date\n1. ",
                    'is_default' => true, 'created_by' => null, 'created_at' => $now, 'updated_at' => $now,
                ],
                [
                    'id' => (string) Str::uuid(), 'name' => 'Annual General Meeting (AGM)', 'meeting_type' => 'general',
                    'title' => 'Annual General Meeting',
                    'agenda' => "1. Opening & quorum\n2. Adoption of agenda\n3. Previous AGM minutes\n4. Chairperson's report\n5. Audited accounts\n6. Elections\n7. Resolutions\n8. Closing",
                    'discussions' => "MIN 01: Quorum — \nMIN 02: Agenda adopted — \nMIN 03: \nMIN 04: Chairperson's report — \nMIN 05: Accounts — \nMIN 06: Elections — ",
                    'decisions' => "Resolutions:\n1. ", 'action_items' => "Action — Owner — Due date\n1. ",
                    'is_default' => true, 'created_by' => null, 'created_at' => $now, 'updated_at' => $now,
                ],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('defaulter_actions');
        Schema::dropIfExists('minute_templates');
    }
};
