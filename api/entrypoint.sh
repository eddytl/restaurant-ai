#!/bin/sh
set -e

echo "==> Seeding database..."
node seed.js

echo "==> Starting API server..."
exec node server.js
