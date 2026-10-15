# Production Deployment

## Domains

- Public website: `https://kirinyagahealthcareworkerswelfare.co.ke/`
- Member and administration app: `https://app.kirinyagahealthcareworkerswelfare.co.ke/`

The public website is hosted from the account's main `public_html` directory. The app has its own cPanel domain directory and Laravel API. Keep these document roots separate.

## App deployment target

```text
/home/kirinyag/public_html/app.kirinyagahealthcareworkerswelfare.co.ke/khwwc
```

Build the browser SPA from the repository root with `npm run build:cpanel`. The cPanel Vite configuration uses a dedicated browser entry plus TanStack Router's Vite plugin with automatic route code splitting; it intentionally does not deploy the Cloudflare SSR server bundle. Deploy the generated `dist/` contents into the app `public/` directory while preserving the Laravel `.env`, storage, and backend files.

The app domain's document root is `khwwc/public/`. The current app deployment is a frontend-only canary and does not contain Laravel's `public/index.php`; app API requests must therefore use app1. Use [app-spa-public.htaccess](./deployment/app-spa-public.htaccess) there to serve static assets and fall back to `index.html` for client-side routes while leaving `/api/*` as unavailable on app. Preserve the PHP handler block managed by cPanel.

## Environment and database

Preserve the existing production `.env`; never replace it with an example file or print its values. During the frontend canary, build with `VITE_API_BASE_URL=https://app1.kirinyagahealthcareworkerswelfare.co.ke/api` so app1 remains the only backend and write authority. Do not connect the app Laravel backend to the production database until its code, schema, shared cache invalidation, and media handling have been validated together. For a later backend cutover, `APP_URL` and the Co-operative Bank callback base URL must use the app domain.

## Migration safety

Back up the selected database before any schema change. Check migration status with PHP 8.4 and apply only migrations that are required by the deployed code and have been reviewed as additive and safe. The app must share the existing uploaded-media directory before serving media from its own Laravel backend. Do not run the generic deployment scripts or an unrestricted `migrate --force` as part of a release.

## Verification

After switching the release, verify:

- `https://app.kirinyagahealthcareworkerswelfare.co.ke/login`
- `https://app.kirinyagahealthcareworkerswelfare.co.ke/api/health`
- CSS, JavaScript, theme images, and gallery media load successfully
- Member and administration workflows use the intended production database

Keep the previous release and its environment files private for rollback. Never expose or commit production environment values.

Legacy deployment, backup, and bank-configuration scripts are disabled. Do not use scripts that replace `.env`, expose credentials, or apply all pending migrations.
