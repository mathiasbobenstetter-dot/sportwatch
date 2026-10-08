import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.API_FOOTBALL_KEY; // Gleicher Key wie für Fußball/NFL

  if (!apiKey) {
    return NextResponse.json(
      { error: "API Key nicht konfiguriert." },
      { status: 500 }
    );
  }

  const today = new Date().toISOString().split("T")[0];

  try {
    const response = await fetch(
      `https://v1.basketball.api-sports.io/games?date=${today}&league=12`,
      {
        headers: {
          "x-apisports-key": apiKey,
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "NBA API Anfrage fehlgeschlagen.", status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Interner Serverfehler." },
      { status: 500 }
    );
  }
}