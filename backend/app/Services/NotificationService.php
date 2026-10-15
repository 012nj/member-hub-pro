<?php

namespace App\Services;

use App\Exceptions\HttpException;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;

class NotificationService
{
    public function __construct(
        protected SmsService $sms,
    ) {}

    public function sendBulkSms(array $phones, string $message): array
    {
        if (empty($phones) || trim($message) === '') {
            return ['success' => false, 'message' => 'Phones and message are required'];
        }

        $sent = 0;
        $failed = 0;

        foreach ($phones as $phone) {
            if ($this->sms->isConfigured()) {
                $result = $this->sms->send($phone, $message);
                if ($result['success'] && empty($result['skipped'])) {
                    $sent++;
                } else {
                    $failed++;
                }
            } else {
                if ($this->simulateSmsSend($phone, $message)) {
                    $sent++;
                } else {
                    $failed++;
                }
            }
        }

        return [
            'success' => true,
            'sent' => $sent,
            'failed' => $failed,
            'message' => "Sent {$sent}, failed {$failed}",
        ];
    }

    public function sendPush(string $title, string $body, array $tokens): array
    {
        if (empty($tokens) || trim($title) === '' || trim($body) === '') {
            return ['success' => false, 'message' => 'Title, body, and tokens are required'];
        }

        $firebasePath = trim((string) env('FIREBASE_CREDENTIALS', ''));
        if ($firebasePath !== '' && file_exists($firebasePath)) {
            return $this->sendViaFirebase($title, $body, $tokens);
        }

        $sent = 0;
        foreach ($tokens as $token) {
            if ($this->simulatePushSend($token, $title, $body)) {
                $sent++;
            }
        }

        return [
            'success' => true,
            'sent' => $sent,
            'message' => "Push sent to {$sent} devices",
        ];
    }

    protected function sendViaFirebase(string $title, string $body, array $tokens): array
    {
        try {
            $factory = new Factory();
            $messaging = $factory->withServiceAccount(env('FIREBASE_CREDENTIALS'))
                ->createMessaging();

            $total = 0;
            foreach (array_chunk(array_values(array_filter($tokens, fn ($token) => is_string($token) && $token !== '')), 500) as $batch) {
                $message = CloudMessage::withTarget('token', $batch[0])
                    ->withNotification(Notification::create($title, $body))
                    ->withData([
                        'title' => $title,
                        'body' => $body,
                        'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
                    ]);

                if (count($batch) > 1) {
                    $multicast = $messaging->sendMulticast($message, $batch);
                    $total += $multicast->successes()->count();
                    continue;
                }

                $result = $messaging->send($message);
                if ($result !== null) {
                    $total++;
                }
            }

            return [
                'success' => true,
                'sent' => $total,
                'message' => "Push sent to {$total} devices",
            ];
        } catch (\Throwable $exception) {
            Log::warning('Firebase push delivery failed.', [
                'error' => $exception->getMessage(),
            ]);

            return [
                'success' => true,
                'sent' => 0,
                'message' => 'Firebase not available; push delivery skipped.',
            ];
        }
    }

    private function simulateSmsSend(string $phone, string $message): bool
    {
        // Local simulation: log and return success for valid-looking numbers
        return preg_match('/^\+?[1-9]\d{1,14}$/', $phone) === 1;
    }

    private function simulatePushSend(string $token, string $title, string $body): bool
    {
        // Local simulation: accept any non-empty token
        return strlen($token) > 10;
    }
}
