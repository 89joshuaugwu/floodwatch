#!/usr/bin/env bash
# Manual verification script for Phase 2 (see PROMPT.md).
# Posts a sequence of test readings to a running dev server to confirm
# getSeverityTier() and checkRisingTrend() behave correctly before wiring
# up the real Wokwi simulation.
#
# Usage:
#   ./scripts/test-readings.sh <stationId> <deviceApiKey> [baseUrl]
#
# Example:
#   ./scripts/test-readings.sh station123 flood-esp32-secret-key http://localhost:3000

set -euo pipefail

STATION_ID="${1:?Usage: test-readings.sh <stationId> <deviceApiKey> [baseUrl]}"
DEVICE_KEY="${2:?Missing deviceApiKey}"
BASE_URL="${3:-http://localhost:3000}"
ENDPOINT="${BASE_URL}/api/sensors/${STATION_ID}/reading"

post_reading() {
  local level="$1"
  local rainfall="$2"
  echo "POST waterLevel=${level} rainfall=${rainfall}"
  curl -s -o /dev/stderr -w "  -> HTTP %{http_code}\n" \
    -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "X-Device-Key: ${DEVICE_KEY}" \
    -d "{\"waterLevel\": ${level}, \"rainfall\": ${rainfall}}"
}

echo "== Case 1: flat/normal readings (no alert expected) =="
post_reading 10 0
sleep 2
post_reading 10.2 0

echo ""
echo "== Case 2: slow rise, still below watch threshold (no rate-of-rise alert expected) =="
post_reading 12 0
sleep 2
post_reading 13 1

echo ""
echo "== Case 3: fast rise, still below hard threshold (Watch alert expected via rising_trend) =="
post_reading 15 2
sleep 2
post_reading 35 5

echo ""
echo "== Case 4: crosses hard Danger threshold (Danger alert expected via threshold) =="
post_reading 60 8

echo ""
echo "Done. Check /admin/alerts (or the alerts collection in Firestore) to confirm each case."
