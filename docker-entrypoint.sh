#!/bin/sh
set -e

# Runtime env var substitution for Vite build output.
# At build time, placeholders like __VITE_ARK_SERVER__ are baked into the JS
# bundle (one ARG per var in the Dockerfile). At container startup each
# placeholder is replaced with the matching VITE_* env var, so one image can
# serve multiple environments. Iterating over the environment means a new
# VITE_* var only needs its ARG in the Dockerfile — no matching line here.

JS_DIR="/usr/share/nginx/html/assets"

for name in $(printenv | sed -n 's/^\(VITE_[A-Za-z0-9_]*\)=.*/\1/p'); do
  value=$(printenv "$name")
  # Skip empties so an unset var leaves its __VITE_*__ placeholder in place;
  # the app treats a leftover placeholder as "unset" (see fromRuntimeEnv).
  [ -n "$value" ] || continue
  escaped_value=$(printf '%s' "$value" | sed 's/[&|\\]/\\&/g')
  find "$JS_DIR" -name '*.js' -exec sed -i "s|__${name}__|${escaped_value}|g" {} +
done

exec "$@"
