import { NextRequest, NextResponse } from "next/server";
import { adminDb, Timestamp } from "@/lib/firebase-admin";
import { checkThresholdsAndAlert } from "@/lib/alerts";

interface ReadingBody {
  waterLevel: number;
  rainfall: number;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await params;

  const deviceKey = request.headers.get("X-Device-Key");
  if (!deviceKey || deviceKey !== process.env.DEVICE_API_KEY) {
    return NextResponse.json({ error: "Unauthorized device." }, { status: 401 });
  }

  let body: ReadingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { waterLevel, rainfall } = body;
  if (typeof waterLevel !== "number" || Number.isNaN(waterLevel)) {
    return NextResponse.json({ error: "waterLevel must be a number." }, { status: 400 });
  }
  const safeRainfall = typeof rainfall === "number" && !Number.isNaN(rainfall) ? rainfall : 0;

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

    await checkThresholdsAndAlert(stationId, waterLevel);

    return NextResponse.json({ ok: true, readingId: readingRef.id }, { status: 201 });
  } catch (err) {
    console.error("Failed to ingest sensor reading:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
