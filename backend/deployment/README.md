# App-domain deployment

The public website remains at `https://kirinyagahealthcareworkerswelfare.co.ke/`; deploy the application to `https://app.kirinyagahealthcareworkerswelfare.co.ke/`.

## Shared production database deployment

The approved app-domain deployment uses the same production database as app1. Both Laravel applications can write to that database, so keep their schema and payment behavior compatible. Do not run the full migration set or seeders against this database. Check app1's migration ledger first, make a private database backup, and apply only an individually reviewed additive migration that the app-domain code requires. Never seed demo members, balances, contributions, or transactions.

Build the TanStack frontend with same-origin API requests (`VITE_API_BASE_URL=/api`) so app-domain writes go through its Laravel backend. Keep the app's own `APP_KEY` and app-domain `APP_URL`/CORS values; copy the required production service settings and database connection privately. Do not include an active `.env` in a release archive.

App1's domain document root is its Laravel project root, so it serves the React/Vite files there. The app subdomain is configured differently: its document root is `khwwc/public`. For the current app deployment, publish frontend files into that configured directory and retain its Laravel `index.php` and `.htaccess`. Do not assume files copied to the app parent directory are served. Do not deploy the default Cloudflare SSR output to this host.

Before building, create the repository-root `.env.production` from `.env.production.example` and set `VITE_API_BASE_URL` for the intended API authority. For the shared-database deployment above, set it to `/api`. The cPanel Vite config loads environment files from the repository root even though the browser entry lives under `spa/`.

The Laravel project path is:

```text
/home/kirinyag/public_html/app.kirinyagahealthcareworkerswelfare.co.ke/khwwc
```

For a standalone frontend canary, build with `VITE_API_BASE_URL=https://app1.kirinyagahealthcareworkerswelfare.co.ke/api`; app1 remains the only backend and write authority. Preserve app's `.env`, `storage/`, and database connection without modification.

For app-domain activation with the current cPanel document root:

1. Create a private backup of `khwwc/public/index.html`.
2. Stage the built `assets/`, `images/`, and referenced public icons/files in `khwwc/public/`; do not overwrite `index.php` or `.htaccess`.
3. Verify each new hashed asset and image is present, then atomically replace `khwwc/public/index.html`. Laravel's web fallback reads this file for SPA routes; API routes continue through `index.php`.
4. Keep the app's `.env`, `storage/`, and database connection unchanged. Ensure the public directory and static asset directories are traversable by LiteSpeed (typically mode `0755`) and static files are readable (typically `0644`).
5. Do not run broad migrations, seed demo members, or alter financial data as part of a frontend deployment.

After activation, verify `/login`, a deep link, static assets, `/api/health`, and CORS. Confirm the request is served by the configured document root; a successful HTTP response alone does not prove a new bundle was activated. Keep private rollback copies of the previous public index and ensure all hashed assets referenced by the new index are present before switching it.

`app-domain.htaccess` describes an alternative layout for a vhost whose document root is the app parent directory. Do not install it while cPanel still points the app vhost at `khwwc/public`.

The legacy `deploy-prod.sh` and `production_deploy.sh` scripts are disabled. Do not use generic cPanel deployment scripts that replace `.env` or apply all migrations.
