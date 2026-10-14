<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Downloads the AGM & team-building 2025 photographs (credited to ianphotography)
 * into storage/app/private/website-media so WebsiteInitialContentSeeder can
 * register them as public website gallery items. Existing files are kept.
 */
class FetchWebsiteGalleryCommand extends Command
{
    protected $signature = 'website:fetch-gallery {--force : re-download files that already exist}';

    protected $description = 'Download the KHCWW AGM 2025 gallery photographs into website media storage.';

    public function handle(): int
    {
        $list = json_decode((string) file_get_contents(database_path('seeders/data/agm-gallery-2025.json')), true) ?: [];
        $dir = storage_path('app/private/website-media/agm-team-building-2025');
        if (! is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        $ok = 0;
        $failed = 0;
        foreach ($list as $item) {
            $file = $dir.'/'.sprintf('agm-team-building-2025-%02d.jpg', (int) $item['n']);
            if (is_file($file) && ! $this->option('force')) {
                $ok++;
                continue;
            }
            try {
                $response = Http::timeout(60)->retry(2, 500)->get($item['url']);
                if ($response->successful() && str_starts_with((string) $response->header('Content-Type'), 'image/jpeg')) {
                    file_put_contents($file, $response->body());
                    $ok++;
                } else {
                    $failed++;
                    $this->warn("Failed photo {$item['n']} ({$response->status()})");
                }
            } catch (\Throwable $e) {
                $failed++;
                $this->warn("Failed photo {$item['n']}: {$e->getMessage()}");
            }
        }

        $this->info("Gallery photos ready: {$ok}. Failed: {$failed}.");
        if ($failed === 0) {
            $this->info('Next: php artisan db:seed --class=WebsiteInitialContentSeeder --force');
        }

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }
}
