#!/bin/sh
set -e

# Runtime env var substitution for Vite build output.
# At build time, placeholders like __VITE_ARK_SERVER__ are baked into the JS
# bundle. At container startup, this script replaces them with actual env var
# values, allowing one image to serve multiple environments.

JS_DIR="/usr/share/nginx/html/assets"

substitute() {
  local placeholder="$1"
  local value="$2"
  if [ -n "$value" ]; then
    find "$JS_DIR" -name '*.js' -exec sed -i "s|${placeholder}|${value}|g" {} +
  fi
}

substitute "__VITE_ARK_SERVER__"                "$VITE_ARK_SERVER"
substitute "__VITE_BOLTZ_URL__"                 "$VITE_BOLTZ_URL"
substitute "__VITE_SENTRY_DSN__"                "$VITE_SENTRY_DSN"
substitute "__VITE_NOSTR_RELAY_URL__"           "$VITE_NOSTR_RELAY_URL"
substitute "__VITE_CHATWOOT_WEBSITE_TOKEN__"    "$VITE_CHATWOOT_WEBSITE_TOKEN"
substitute "__VITE_CHATWOOT_BASE_URL__"         "$VITE_CHATWOOT_BASE_URL"
substitute "__VITE_LENDASAT_IFRAME_URL__"       "$VITE_LENDASAT_IFRAME_URL"
substitute "__VITE_LENDASWAP_IFRAME_URL__"      "$VITE_LENDASWAP_IFRAME_URL"
substitute "__VITE_VERIFIED_ASSETS_URL__"       "$VITE_VERIFIED_ASSETS_URL"
substitute "__VITE_APP_VERSION__"               "$VITE_APP_VERSION"

exec "$@"
