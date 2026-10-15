# cPanel Deployment

The public site remains at `https://kirinyagahealthcareworkerswelfare.co.ke/`. The member application is hosted at `https://app.kirinyagahealthcareworkerswelfare.co.ke/`.

## Host paths

- Domain directory: `/home/kirinyag/public_html/app.kirinyagahealthcareworkerswelfare.co.ke/`
- Laravel project: `/home/kirinyag/public_html/app.kirinyagahealthcareworkerswelfare.co.ke/khwwc`
- Laravel public directory: `/home/kirinyag/public_html/app.kirinyagahealthcareworkerswelfare.co.ke/khwwc/public`

The account serves PHP/Laravel and static browser assets. Build the client bundle with `npm run build:cpanel` from the repository root; do not deploy the default Cloudflare SSR build to this PHP-only host.

The cPanel build uses a dedicated browser entry and TanStack Router's Vite plugin with automatic route code splitting. It emits static files to `dist/`; cPanel serves the SPA through Apache/LiteSpeed rewrites, with no Node.js server process.

## Release requirements

1. For a frontend canary, build with `VITE_API_BASE_URL=https://app1.kirinyagahealthcareworkerswelfare.co.ke/api`; app1 remains the only backend and write authority.
2. Back up the current app `public/` directory outside the webroot before publishing.
3. Publish static `dist/` files into the app `public/` directory without replacing PHP files. The current app webroot does not contain Laravel's `index.php`.
4. Apply [deployment/app-spa-public.htaccess](./deployment/app-spa-public.htaccess) while preserving the PHP handler block managed by cPanel. The app canary calls app1 directly; its own `/api/*` is not enabled.
5. Verify `/login`, client-side deep links, built assets, and app1 API health/CORS. The app's own Laravel backend and database connection remain unchanged during the canary.
6. Do not connect app's backend to the live database or run migrations until backend/schema/cache/media compatibility has been reviewed and verified.

Use the staged deployment procedure in [deployment/README.md](./deployment/README.md). The legacy direct deployment scripts are intentionally disabled because they can overwrite production configuration or apply unreviewed migrations.
