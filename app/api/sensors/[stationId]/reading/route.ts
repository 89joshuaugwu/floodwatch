import { NextRequest, NextResponse } from "next/server";
import { adminDb, Timestamp } from "@/lib/firebase-admin";
import { checkThresholdsAndAlert } from "@/lib/alerts";

export async function POST(request: NextRequest, { params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await params;

  const deviceKey = request.headers.get("X-Device-Key");
  if (!deviceKey || deviceKey !== process.env.DEVICE_API_KEY) {
    return NextResponse.json({ error: "Unauthorized device." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object." }, { status: 400 });
  }

  const { waterLevel, rainfall } = body as Record<string, unknown>;
  if (typeof waterLevel !== "number" || !Number.isFinite(waterLevel) || waterLevel < 0 || waterLevel > 1000) {
    return NextResponse.json({ error: "waterLevel must be a finite number from 0 to 1000." }, { status: 400 });
  }
  if (rainfall !== undefined && (typeof rainfall !== "number" || !Number.isFinite(rainfall) || rainfall < 0 || rainfall > 1000)) {
    return NextResponse.json({ error: "rainfall must be a finite number from 0 to 1000 when provided." }, { status: 400 });
  }
  const safeRainfall = rainfall ?? 0;

  try {
    const stationRef = adminDb.collection("stations").doc(stationId);
    const stationDoc = await stationRef.get();
    if (!stationDoc.exists) {
      return NextResponse.json({ error: `Unknown station: ${stationId}` }, { status: 404 });
    }

    const readingRef = stationRef.collection("readings").doc();
    await readingRef.set({
      waterLevel,
      rainfall: safeRainfall,
      timestamp: Timestamp.now(),
    });

    try {
      await checkThresholdsAndAlert(stationId, waterLevel);
    } catch (err) {
      // The sample is already persisted. Reporting a failed ingestion here
      // makes devices retry it even though the website can display it.
      console.error(`Reading saved but alert processing failed for station ${stationId}:`, err);
      return NextResponse.json({
        ok: true,
        readingId: readingRef.id,
        warning: "Reading saved, but alert processing failed. Check server logs.",
      }, { status: 201 });
    }

    return NextResponse.json({ ok: true, readingId: readingRef.id }, { status: 201 });
  } catch (err) {
    console.error("Failed to ingest sensor reading:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
