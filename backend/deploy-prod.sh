#!/usr/bin/env bash
set -euo pipefail

echo "This legacy deployment script is disabled."
echo "It is unsafe for the app subdomain and must not overwrite production .env or run migrations."
echo "Use the staged app-domain deployment procedure documented in deployment/README.md."
exit 1
