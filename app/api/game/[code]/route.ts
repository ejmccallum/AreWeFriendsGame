import { NextResponse } from "next/server";
import { normalizeAnswer, promptFor, questionCountFor, type GameMode, type GameState, type Player, type QuestionPack, type Room, type Team, type TeamResult } from "@/lib/game";
import { supabaseAdmin } from "@/lib/supabase";

type RawRoom = {
  code: string;
  host_player_id: string;
  phase: Room["phase"];
  round_number: number;
  round_limit: number;
  round_started_at: string | null;
  duration_seconds: number;
  score_a: number;
  score_b: number;
  game_seed: string;
  game_mode: GameMode;
  rounds_per_player: number;
  question_pack: QuestionPack;
};

type RawPlayer = { id: string; display_name: string; team: Team | null; score: number; joined_at: string };
type RawAnswer = { player_id: string; target_player_id: string; answer: string };
type RawVote = { voter_id: string; team: Team; counts: boolean };

export const dynamic = "force-dynamic";

function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function toRoom(row: RawRoom): Room {
  return {
    code: row.code,
    hostPlayerId: row.host_player_id,
    phase: row.phase,
    roundNumber: row.round_number,
    roundLimit: row.round_limit,
    roundStartedAt: row.round_started_at,
    durationSeconds: row.duration_seconds,
    scoreA: row.score_a,
    scoreB: row.score_b,
    gameSeed: row.game_seed,
    gameMode: row.game_mode,
    roundsPerPlayer: row.rounds_per_player,
    questionPack: row.question_pack
  };
}

function toPlayer(row: RawPlayer): Player {
  return { id: row.id, displayName: row.display_name, team: row.team, score: row.score, joinedAt: row.joined_at };
}

function targetFor(team: Team, roundNumber: number, players: Player[]) {
  const teamPlayers = players.filter((player) => player.team === team);
  return teamPlayers[(roundNumber - 1) % 2];
}

function spotlightAnswerer(room: Room, players: Player[]) {
  if (players.length === 0 || room.roundNumber < 1) return null;
  const playerIndex = Math.floor((room.roundNumber - 1) / room.roundsPerPlayer) % players.length;
  return players[playerIndex];
}

async function roomAndPlayers(code: string) {
  const database = supabaseAdmin();
  const { data: roomData, error: roomError } = await database.from("rooms").select("*").eq("code", code).maybeSingle();
  if (roomError) throw roomError;
  if (!roomData) return null;
  const { data: playerData, error: playerError } = await database
    .from("players")
    .select("id, display_name, team, score, joined_at")
    .eq("room_code", code)
    .order("joined_at");
  if (playerError) throw playerError;
  return { room: toRoom(roomData as RawRoom), players: (playerData as RawPlayer[]).map(toPlayer) };
}

async function addBlankAnswers(room: Room, players: Player[]) {
  const database = supabaseAdmin();
  const spotlightTarget = room.gameMode === "spotlight" ? spotlightAnswerer(room, players) : null;
  const records = players.map((player) => ({
    room_code: room.code,
    round_number: room.roundNumber,
    player_id: player.id,
    target_player_id: spotlightTarget?.id ?? targetFor(player.team as Team, room.roundNumber, players).id,
    answer: ""
  }));
  const { error } = await database.from("round_answers").upsert(records, { onConflict: "room_code,round_number,player_id", ignoreDuplicates: true });
  if (error) throw error;
}

async function answersFor(room: Room) {
  const database = supabaseAdmin();
  const { data, error } = await database
    .from("round_answers")
    .select("player_id, target_player_id, answer")
    .eq("room_code", room.code)
    .eq("round_number", room.roundNumber);
  if (error) throw error;
  return (data ?? []) as RawAnswer[];
}

function exactMatch(team: Team, room: Room, players: Player[], answers: RawAnswer[]) {
  const teamPlayers = players.filter((player) => player.team === team);
  const teamAnswers = teamPlayers.map((player) => answers.find((answer) => answer.player_id === player.id)?.answer ?? "");
  return teamAnswers.length === 2 && teamAnswers.every(Boolean) && normalizeAnswer(teamAnswers[0]) === normalizeAnswer(teamAnswers[1]);
}

async function finalizeAnswers(room: Room, players: Player[]) {
  if (room.gameMode === "spotlight") {
    return finalizeSpotlightAnswers(room, players);
  }
  await addBlankAnswers(room, players);
  const answers = await answersFor(room);
  const matchA = exactMatch("a", room, players, answers);
  const matchB = exactMatch("b", room, players, answers);
  const database = supabaseAdmin();
  const { data, error } = await database
    .from("rooms")
    .update({
      phase: matchA && matchB ? "reveal" : "voting",
      score_a: room.scoreA + (matchA && matchB ? 1 : 0),
      score_b: room.scoreB + (matchA && matchB ? 1 : 0)
    })
    .eq("code", room.code)
    .eq("phase", "answering")
    .select("code");
  if (error) throw error;
  return (data ?? []).length > 0;
}

async function finalizeSpotlightAnswers(room: Room, players: Player[]) {
  await addBlankAnswers(room, players);
  const answerer = spotlightAnswerer(room, players);
  if (!answerer) return false;
  const answers = await answersFor(room);
  const answererAnswer = answers.find((answer) => answer.player_id === answerer.id)?.answer ?? "";
  const matchingPlayers = players.filter((player) => {
    const answer = answers.find((entry) => entry.player_id === player.id)?.answer ?? "";
    return player.id !== answerer.id && Boolean(answererAnswer) && Boolean(answer) && normalizeAnswer(answer) === normalizeAnswer(answererAnswer);
  });
  const database = supabaseAdmin();
  const { data, error } = await database
    .from("rooms")
    .update({ phase: "reveal" })
    .eq("code", room.code)
    .eq("phase", "answering")
    .select("code");
  if (error) throw error;
  if ((data ?? []).length === 0) return false;
  for (const player of matchingPlayers) {
    const { error: scoreError } = await database
      .from("players")
      .update({ score: player.score + 1 })
      .eq("id", player.id)
      .eq("room_code", room.code);
    if (scoreError) throw scoreError;
  }
  return true;
}

async function syncGame(room: Room, players: Player[]) {
  if (room.phase !== "answering") return;
  const currentAnswers = await answersFor(room);
  const expired = room.roundStartedAt
    ? Date.now() >= new Date(room.roundStartedAt).getTime() + room.durationSeconds * 1000
    : false;
  if (currentAnswers.length === players.length || expired) {
    await finalizeAnswers(room, players);
  }
}

async function getState(code: string, playerId: string): Promise<GameState | null> {
  const details = await roomAndPlayers(code);
  if (!details) return null;
  const { room, players } = details;
  const me = players.find((player) => player.id === playerId);
  if (!me) return null;
  const currentTarget = room.phase === "answering"
    ? room.gameMode === "spotlight"
      ? spotlightAnswerer(room, players)
      : me.team ? targetFor(me.team, room.roundNumber, players) : null
    : null;
  const database = supabaseAdmin();
  let answers: RawAnswer[] = [];
  let votes: RawVote[] = [];
  if (room.phase !== "lobby") {
    answers = await answersFor(room);
  }
  if (room.phase === "voting" || room.phase === "reveal" || room.phase === "finished") {
    const { data, error } = await database
      .from("round_votes")
      .select("voter_id, team, counts")
      .eq("room_code", code)
      .eq("round_number", room.roundNumber);
    if (error) throw error;
    votes = (data ?? []) as RawVote[];
  }

  const teamResults: TeamResult[] = room.gameMode === "spotlight" || room.phase === "lobby" || room.phase === "answering"
    ? []
    : (["a", "b"] as Team[]).map((team) => {
        const target = targetFor(team, room.roundNumber, players);
        const members = players.filter((player) => player.team === team);
        const teamAnswers = members.map((member) => ({
          playerId: member.id,
          playerName: member.displayName,
          answer: answers.find((answer) => answer.player_id === member.id)?.answer ?? ""
        }));
        const isExact = exactMatch(team, room, players, answers);
        const teamVotes = votes.filter((vote) => vote.team === team);
        const votesFor = teamVotes.filter((vote) => vote.counts).length;
        const needsVote = !isExact;
        return {
          team,
          targetName: target?.displayName ?? "your teammate",
          prompt: promptFor(target?.displayName ?? "your teammate", room.gameSeed, room.roundNumber, room.questionPack),
          answers: teamAnswers,
          exactMatch: isExact,
          needsVote,
          votesFor,
          votesTotal: teamVotes.length,
          myVote: teamVotes.find((vote) => vote.voter_id === playerId)?.counts ?? null,
          counted: isExact ? true : room.phase === "voting" ? null : votesFor >= 3
        };
      });

  const answerer = room.gameMode === "spotlight" ? spotlightAnswerer(room, players) : null;
  const answererAnswer = answerer ? answers.find((answer) => answer.player_id === answerer.id)?.answer ?? "" : "";
  const spotlight = room.gameMode !== "spotlight" ? null : {
    answerer,
    turnForAnswerer: room.roundNumber ? ((room.roundNumber - 1) % room.roundsPerPlayer) + 1 : 0,
    entries: room.phase === "answering" ? [] : players.map((player) => {
      const answer = answers.find((entry) => entry.player_id === player.id)?.answer ?? "";
      return {
        playerId: player.id,
        playerName: player.displayName,
        answer,
        matched: player.id === answerer?.id ? null : Boolean(answererAnswer) && Boolean(answer) && normalizeAnswer(answer) === normalizeAnswer(answererAnswer)
      };
    })
  };

  return {
    room,
    players,
    me,
    answerCount: answers.length,
    hasAnswered: answers.some((answer) => answer.player_id === playerId),
    currentPrompt: currentTarget ? promptFor(currentTarget.displayName, room.gameSeed, room.roundNumber, room.questionPack) : null,
    teamResults,
    spotlight
  };
}

async function requireActor(code: string, playerId: unknown) {
  if (typeof playerId !== "string") throw new Error("Missing player session.");
  const state = await getState(code, playerId);
  if (!state) throw new Error("Player is not in this room.");
  return state;
}

async function finishVoting(room: Room, players: Player[]) {
  const answers = await answersFor(room);
  const database = supabaseAdmin();
  const { data: voteData, error: voteError } = await database
    .from("round_votes")
    .select("team, counts")
    .eq("room_code", room.code)
    .eq("round_number", room.roundNumber);
  if (voteError) throw voteError;
  const votes = (voteData ?? []) as Pick<RawVote, "team" | "counts">[];
  const teamsNeedingVote = (["a", "b"] as Team[]).filter((team) => !exactMatch(team, room, players, answers));
  if (votes.length < teamsNeedingVote.length * players.length) return;
  const scoreA = room.scoreA + (exactMatch("a", room, players, answers) || votes.filter((vote) => vote.team === "a" && vote.counts).length >= 3 ? 1 : 0);
  const scoreB = room.scoreB + (exactMatch("b", room, players, answers) || votes.filter((vote) => vote.team === "b" && vote.counts).length >= 3 ? 1 : 0);
  const { error } = await database
    .from("rooms")
    .update({ phase: "reveal", score_a: scoreA, score_b: scoreB })
    .eq("code", room.code)
    .eq("phase", "voting");
  if (error) throw error;
}

async function clearMatchData(code: string) {
  const database = supabaseAdmin();
  const { error: voteError } = await database.from("round_votes").delete().eq("room_code", code);
  if (voteError) throw voteError;
  const { error: answerError } = await database.from("round_answers").delete().eq("room_code", code);
  if (answerError) throw answerError;
}

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const playerId = new URL(request.url).searchParams.get("playerId") ?? "";
    const state = await getState(code.toUpperCase(), playerId);
    return state ? NextResponse.json(state) : apiError("Room or player session not found.", 404);
  } catch (error) {
    console.error(error);
    return apiError("Could not load the game.", 500);
  }
}

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await context.params;
    const code = rawCode.toUpperCase();
    const body = await request.json();
    const action = body.action;
    const state = await requireActor(code, body.playerId);
    const { room, players, me } = state;
    const database = supabaseAdmin();

    if (action === "sync") {
      await syncGame(room, players);
    } else if (action === "set-mode") {
      if (me.id !== room.hostPlayerId || room.phase !== "lobby") return apiError("Only the host can choose a game mode.", 403);
      const mode = body.mode === "spotlight" ? "spotlight" : "teams";
      const { error } = await database.from("rooms").update({ game_mode: mode }).eq("code", code);
      if (error) throw error;
    } else if (action === "set-question-pack") {
      if (me.id !== room.hostPlayerId || room.phase !== "lobby") return apiError("Only the host can choose a question pack.", 403);
      const questionPack: QuestionPack = ["all", "wholesome", "comedic"].includes(body.questionPack) ? body.questionPack : "all";
      const { error } = await database.from("rooms").update({ question_pack: questionPack }).eq("code", code);
      if (error) throw error;
    } else if (action === "assign") {
      if (room.gameMode !== "teams") return apiError("Teams are only used in 2v2 mode.");
      if (me.id !== room.hostPlayerId || room.phase !== "lobby") return apiError("Only the host can set teams before the game starts.", 403);
      const assignments = Array.isArray(body.assignments) ? body.assignments : [];
      if (assignments.length !== 4) return apiError("Assign all four players to a team.");
      const ids = assignments.map((assignment: { playerId?: string }) => assignment.playerId);
      const teams = assignments.map((assignment: { team?: Team }) => assignment.team);
      if (new Set(ids).size !== 4 || teams.filter((team: Team) => team === "a").length !== 2 || teams.filter((team: Team) => team === "b").length !== 2) {
        return apiError("Create two teams of two.");
      }
      for (const assignment of assignments) {
        const { error } = await database.from("players").update({ team: assignment.team }).eq("id", assignment.playerId).eq("room_code", code);
        if (error) throw error;
      }
    } else if (action === "start") {
      if (me.id !== room.hostPlayerId || room.phase !== "lobby") return apiError("Only the host can start from the lobby.", 403);
      const mode = body.mode === "spotlight" ? "spotlight" : "teams";
      const durationSeconds = [30, 60, 90].includes(Number(body.durationSeconds)) ? Number(body.durationSeconds) : 60;
      const questionPack: QuestionPack = ["all", "wholesome", "comedic"].includes(body.questionPack) ? body.questionPack : "all";
      if (mode === "spotlight") {
        if (players.length < 2 || players.length > 8) return apiError("Spotlight needs between 2 and 8 players.");
        const roundsPerPlayer = [3, 4, 5, 6].includes(Number(body.roundsPerPlayer)) ? Number(body.roundsPerPlayer) : 3;
        if (questionCountFor(questionPack) < players.length * roundsPerPlayer) return apiError("That question pack is too small for this many Spotlight rounds.");
        const { error: playerError } = await database.from("players").update({ team: null, score: 0 }).eq("room_code", code);
        if (playerError) throw playerError;
        const { error } = await database
          .from("rooms")
          .update({ phase: "answering", game_mode: "spotlight", question_pack: questionPack, round_number: 1, round_limit: players.length * roundsPerPlayer, rounds_per_player: roundsPerPlayer, duration_seconds: durationSeconds, score_a: 0, score_b: 0, round_started_at: new Date().toISOString(), game_seed: crypto.randomUUID() })
          .eq("code", code);
        if (error) throw error;
        const nextState = await getState(code, me.id);
        return NextResponse.json(nextState);
      }
      const assignments = Array.isArray(body.assignments) ? body.assignments : [];
      const ids = assignments.map((assignment: { playerId?: string }) => assignment.playerId);
      const teams = assignments.map((assignment: { team?: Team }) => assignment.team);
      if (players.length !== 4 || assignments.length !== 4 || new Set(ids).size !== 4 || teams.filter((team: Team) => team === "a").length !== 2 || teams.filter((team: Team) => team === "b").length !== 2) {
        return apiError("You need four players in two teams of two.");
      }
      for (const assignment of assignments) {
        const { error } = await database.from("players").update({ team: assignment.team }).eq("id", assignment.playerId).eq("room_code", code);
        if (error) throw error;
      }
      const roundLimit = [4, 6, 8, 10].includes(Number(body.roundLimit)) ? Number(body.roundLimit) : 8;
      if (questionCountFor(questionPack) < roundLimit) return apiError("That question pack is too small for this many rounds.");
      const { error } = await database
        .from("rooms")
        .update({ phase: "answering", game_mode: "teams", question_pack: questionPack, round_number: 1, duration_seconds: durationSeconds, round_limit: roundLimit, round_started_at: new Date().toISOString(), game_seed: crypto.randomUUID() })
        .eq("code", code);
      if (error) throw error;
    } else if (action === "answer") {
      if (room.phase !== "answering" || (room.gameMode === "teams" && !me.team)) return apiError("Answers are not open right now.");
      const roundExpired = room.roundStartedAt
        ? Date.now() >= new Date(room.roundStartedAt).getTime() + room.durationSeconds * 1000
        : false;
      if (roundExpired) {
        await syncGame(room, players);
        return apiError("Time is up — the answers are being revealed.");
      }
      const answer = typeof body.answer === "string" ? body.answer.trim().slice(0, 120) : "";
      if (!answer) return apiError("Type an answer before submitting.");
      const target = room.gameMode === "spotlight" ? spotlightAnswerer(room, players) : targetFor(me.team as Team, room.roundNumber, players);
      if (!target) return apiError("Could not find this round's answerer.");
      const { error } = await database.from("round_answers").upsert({
        room_code: code,
        round_number: room.roundNumber,
        player_id: me.id,
        target_player_id: target.id,
        answer
      }, { onConflict: "room_code,round_number,player_id" });
      if (error) throw error;
      await syncGame(room, players);
    } else if (action === "vote") {
      if (room.phase !== "voting") return apiError("Voting is not open right now.");
      const team = body.team as Team;
      const counts = body.counts;
      if ((team !== "a" && team !== "b") || typeof counts !== "boolean") return apiError("Choose whether the answers should count.");
      const answers = await answersFor(room);
      if (exactMatch(team, room, players, answers)) return apiError("That team already has an exact match.");
      const { error } = await database.from("round_votes").upsert({
        room_code: code,
        round_number: room.roundNumber,
        voter_id: me.id,
        team,
        counts
      }, { onConflict: "room_code,round_number,voter_id,team" });
      if (error) throw error;
      await finishVoting(room, players);
    } else if (action === "next") {
      if (me.id !== room.hostPlayerId || room.phase !== "reveal") return apiError("Only the host can advance after the reveal.", 403);
      const isFinished = room.roundNumber >= room.roundLimit;
      const { error } = await database
        .from("rooms")
        .update(isFinished
          ? { phase: "finished" }
          : { phase: "answering", round_number: room.roundNumber + 1, round_started_at: new Date().toISOString() })
        .eq("code", code);
      if (error) throw error;
    } else if (action === "rematch") {
      if (me.id !== room.hostPlayerId || room.phase !== "finished") return apiError("Only the host can start a rematch.", 403);
      await clearMatchData(code);
      if (room.gameMode === "spotlight") {
        const { error: playerError } = await database.from("players").update({ score: 0 }).eq("room_code", code);
        if (playerError) throw playerError;
      }
      const { error } = await database
        .from("rooms")
        .update({ phase: "answering", round_number: 1, score_a: 0, score_b: 0, round_started_at: new Date().toISOString(), game_seed: crypto.randomUUID() })
        .eq("code", code);
      if (error) throw error;
    } else if (action === "remake-teams") {
      if (me.id !== room.hostPlayerId || room.phase !== "finished") return apiError("Only the host can return to the lobby.", 403);
      await clearMatchData(code);
      const { error: playerError } = await database.from("players").update({ team: null, score: 0 }).eq("room_code", code);
      if (playerError) throw playerError;
      const { error: roomError } = await database
        .from("rooms")
        .update({ phase: "lobby", game_mode: "teams", question_pack: "all", round_number: 0, score_a: 0, score_b: 0, round_started_at: null })
        .eq("code", code);
      if (roomError) throw roomError;
    } else {
      return apiError("Unknown game action.");
    }

    const nextState = await getState(code, me.id);
    return NextResponse.json(nextState);
  } catch (error) {
    console.error(error);
    return apiError(error instanceof Error ? error.message : "Could not update the game.", 500);
  }
}
