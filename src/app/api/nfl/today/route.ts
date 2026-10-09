import { NextResponse } from "next/server";

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const apiKey = process.env.API_FOOTBALL_KEY || "";

    const response = await fetch(
      `https://v1.american-football.api-sports.io/games?date=${today}`,
      {
        headers: {
          "x-apisports-key": apiKey,
        },
        next: { revalidate: 300 }, // Cache für 5 Minuten
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "NFL API Anfrage fehlgeschlagen.", status: response.status },
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