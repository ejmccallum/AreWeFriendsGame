import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const roomAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 24) : "";
}

function makeCode() {
  return Array.from({ length: 6 }, () => roomAlphabet[Math.floor(Math.random() * roomAlphabet.length)]).join("");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;
    const name = cleanName(body.name);
    const database = supabaseAdmin();

    if (!name) {
      return NextResponse.json({ error: "Enter a display name first." }, { status: 400 });
    }

    if (action === "create") {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = makeCode();
        const hostPlayerId = crypto.randomUUID();
        const { error: roomError } = await database.from("rooms").insert({
          code,
          host_player_id: hostPlayerId
        });

        if (roomError?.code === "23505") continue;
        if (roomError) throw roomError;

        const { error: playerError } = await database.from("players").insert({
          id: hostPlayerId,
          room_code: code,
          display_name: name
        });
        if (playerError) throw playerError;

        return NextResponse.json({ roomCode: code, playerId: hostPlayerId });
      }
      return NextResponse.json({ error: "Could not create a room. Try again." }, { status: 409 });
    }

    if (action === "join") {
      const code = typeof body.roomCode === "string" ? body.roomCode.trim().toUpperCase() : "";
      const { data: room, error: roomError } = await database
        .from("rooms")
        .select("phase")
        .eq("code", code)
        .maybeSingle();
      if (roomError) throw roomError;
      if (!room) return NextResponse.json({ error: "That room does not exist." }, { status: 404 });
      if (room.phase !== "lobby") return NextResponse.json({ error: "This game has already started." }, { status: 409 });

      const { count, error: countError } = await database
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("room_code", code);
      if (countError) throw countError;
      if ((count ?? 0) >= 8) return NextResponse.json({ error: "This room is full." }, { status: 409 });

      const playerId = crypto.randomUUID();
      const { error: playerError } = await database.from("players").insert({
        id: playerId,
        room_code: code,
        display_name: name
      });
      if (playerError) throw playerError;

      return NextResponse.json({ roomCode: code, playerId });
    }

    return NextResponse.json({ error: "Unknown room action." }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong. Check the server configuration." }, { status: 500 });
  }
}
