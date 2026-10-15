# Roadmap

- [ ] Replace dashboard backgrounds with the six uploaded images; preserve layout and add readable dark themes and theme settings.
- [ ] Restore missing public website images without redesigning pages.
- [ ] Recheck frontend/Laravel contracts and document remaining live-verification blockers without running Laravel.

- [x] Frontend preview in demo mode
- [x] Restore Lovable theme backgrounds (sky, gold, crimson, pearl, morning)
- [x] Backend: API gap audit (frontend calls vs Laravel routes)
- [x] Backend: versioned API (/api/v1) keeping old paths working for production
- [x] Backend: add missing controllers/actions so every dashboard button works (zero API gap)
- [x] Backend: instant wallet update on payment (observers + queued jobs), correct totals
- [x] Backend: speed (indexes, caching, eager loading, queued SMS)
- [x] Deployment instructions for the upgrade
- [ ] Frontend: switch preview to real server (api.khwwc.co.ke) — blocked: upgrade must be uploaded to hosting first
- [ ] Public website: redesign, admin management for every page, seed content, news/blog photos
- [x] Member Pay button: dropdown (Monthly contribution / Penalty / Fund drive)
- [x] Contribution allocation by admin rate (e.g. 10000 KES covers N months), penalties after admin grace period + SMS reminder
- [x] Wallets & statements update cleanly on every payment
- [x] STK push narration per payment type; fund drive recorded as donation, donation email confirmation
- [x] Member dashboard redesign: simple grouped menu, overview, quick actions (keep existing design)
- [x] Defaulters: contributions + penalties, suspend/activate/warning/reminder (Laravel DefaulterController)
- [x] Minute templates (Laravel MinuteTemplateController + form picker / save as template)
- [x] Admin "View as member" full takeover (X-View-As-Member header, member routes honour it)
- [x] Chat: private 1-to-1 chats plus group chats
- [ ] Run new Laravel migration on hosting (php artisan migrate) — needs server access

- [ ] Push sign-in freeze fixes to github.com/012nj/member-hub-pro (needs write access)
