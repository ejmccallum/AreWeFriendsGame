"use client";

import { FormEvent, useEffect, useState } from "react";
import { type GameState, type Team } from "@/lib/game";

type Session = { roomCode: string; playerId: string };

const sessionKey = "are-we-friends-session";

function teamName(team: Team) {
  return team === "a" ? "Team Tropic" : "Team Thunder";
}

function scoreFor(state: GameState, team: Team) {
  return team === "a" ? state.room.scoreA : state.room.scoreB;
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [durationSeconds, setDurationSeconds] = useState(60);
  const [roundLimit, setRoundLimit] = useState(8);

  const isHost = Boolean(game && session && game.room.hostPlayerId === session.playerId);
  useEffect(() => {
    const stored = window.sessionStorage.getItem(sessionKey);
    if (stored) {
      try {
        setSession(JSON.parse(stored) as Session);
      } catch {
        window.sessionStorage.removeItem(sessionKey);
      }
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const refresh = async () => {
      const response = await fetch(`/api/game/${session.roomCode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync", playerId: session.playerId }) });
      const payload = await response.json();
      if (!cancelled && response.ok) {
        setGame(payload as GameState);
        setError("");
      }
    };
    refresh();
    const timerId = window.setInterval(refresh, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timerId);
    };
  }, [session]);

  useEffect(() => {
    if (!game?.room.roundStartedAt || game.room.phase !== "answering") return;
    const updateTimer = () => {
      const endsAt = new Date(game.room.roundStartedAt as string).getTime() + game.room.durationSeconds * 1000;
      setRemainingSeconds(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    };
    updateTimer();
    const timerId = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(timerId);
  }, [game?.room.durationSeconds, game?.room.phase, game?.room.roundStartedAt]);

  useEffect(() => {
    if (!game || game.room.phase !== "lobby") return;
    setTeams((current) => {
      const next = { ...current };
      game.players.forEach((player, index) => {
        if (!next[player.id]) next[player.id] = player.team ?? (index < 2 ? "a" : "b");
      });
      return next;
    });
  }, [game]);

  async function createOrJoin(action: "create" | "join", event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, name, roomCode })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      const nextSession = payload as Session;
      window.sessionStorage.setItem(sessionKey, JSON.stringify(nextSession));
      setSession(nextSession);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not enter the room.");
    } finally {
      setBusy(false);
    }
  }

  async function act(action: string, data: Record<string, unknown> = {}) {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/game/${session.roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, playerId: session.playerId, ...data })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setGame(payload as GameState);
      if (action === "answer") setAnswer("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update the game.");
    } finally {
      setBusy(false);
    }
  }

  if (!session || !game) {
    return (
      <main className="welcome-shell">
        <section className="hero-card">
          <p className="eyebrow">2V2 FRIENDSHIP SHOWDOWN</p>
          <h1>Are we<br /><em>friends?</em></h1>
          <p className="intro">Test and compete to find out which duo are better friends</p>
          <div className="rule-row"><span>4 players</span><span>2 teams</span><span>60 seconds</span></div>
          {error && <p className="error">{error}</p>}
          <form className="entry-form" onSubmit={(event) => createOrJoin("create", event)}>
            <label>Your name<input value={name} maxLength={24} onChange={(event) => setName(event.target.value)} placeholder="Enter Name" required /></label>
            <button className="primary-button" disabled={busy}>{busy ? "One sec..." : "Create a game"}</button>
          </form>
          <div className="divider"><span>or join friends</span></div>
          <form className="join-form" onSubmit={(event) => createOrJoin("join", event)}>
            <input value={roomCode} maxLength={6} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="ROOM CODE" required />
            <button disabled={busy || !name}>Join</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div className="brand">ARE WE <em>FRIENDS?</em></div>
        <div className="room-code">ROOM <strong>{game.room.code}</strong></div>
      </header>
      <section className="scoreboard">
        {(["a", "b"] as Team[]).map((team) => (
          <div className={`score-card ${team === "a" ? "tropic" : "thunder"}`} key={team}>
            <span>{teamName(team)}</span><strong>{scoreFor(game, team)}</strong>
          </div>
        ))}
      </section>
      {error && <p className="error game-error">{error}</p>}
      {game.room.phase === "lobby" && <Lobby game={game} teams={teams} isHost={isHost} durationSeconds={durationSeconds} roundLimit={roundLimit} setTeams={setTeams} setDurationSeconds={setDurationSeconds} setRoundLimit={setRoundLimit} start={() => act("start", { durationSeconds, roundLimit, assignments: Object.entries(teams).map(([playerId, team]) => ({ playerId, team })) })} assign={() => act("assign", { assignments: Object.entries(teams).map(([playerId, team]) => ({ playerId, team })) })} busy={busy} />}
      {game.room.phase === "answering" && <AnswerPhase game={game} prompt={game.currentPrompt ?? "Get ready for the next question"} answer={answer} setAnswer={setAnswer} submitted={game.hasAnswered} remainingSeconds={remainingSeconds} submit={() => act("answer", { answer })} busy={busy} />}
      {game.room.phase === "voting" && <VotingPhase game={game} vote={(team, counts) => act("vote", { team, counts })} busy={busy} />}
      {(game.room.phase === "reveal" || game.room.phase === "finished") && <RevealPhase game={game} isHost={isHost} next={() => act("next")} rematch={() => act("rematch")} remakeTeams={() => act("remake-teams")} busy={busy} />}
    </main>
  );
}

function Lobby({ game, teams, isHost, durationSeconds, roundLimit, setTeams, setDurationSeconds, setRoundLimit, assign, start, busy }: { game: GameState; teams: Record<string, Team>; isHost: boolean; durationSeconds: number; roundLimit: number; setTeams: (teams: Record<string, Team>) => void; setDurationSeconds: (value: number) => void; setRoundLimit: (value: number) => void; assign: () => void; start: () => void; busy: boolean }) {
  const ready = game.players.length === 4;
  return <section className="panel lobby"><p className="eyebrow">THE LOBBY</p><h2>Gather your crew</h2><p className="muted">Share code <strong>{game.room.code}</strong>. The host makes two teams of two.</p>
    <div className="players">{game.players.map((player) => <div className="player-row" key={player.id}><span className="avatar">{player.displayName.slice(0, 1)}</span><strong>{player.displayName}</strong>{isHost ? <select value={teams[player.id] ?? "a"} onChange={(event) => setTeams({ ...teams, [player.id]: event.target.value as Team })}><option value="a">Team Tropic</option><option value="b">Team Thunder</option></select> : <span className="team-pill">{player.team ? teamName(player.team) : "Waiting for host"}</span>}</div>)}</div>
    {isHost ? <><div className="settings"><label>Round time<select value={durationSeconds} onChange={(event) => setDurationSeconds(Number(event.target.value))}><option value={30}>30 seconds</option><option value={60}>60 seconds</option><option value={90}>90 seconds</option></select></label><label>Rounds<select value={roundLimit} onChange={(event) => setRoundLimit(Number(event.target.value))}><option value={4}>4 rounds</option><option value={6}>6 rounds</option><option value={8}>8 rounds</option><option value={10}>10 rounds</option></select></label></div><div className="host-actions"><button className="secondary-button" onClick={assign} disabled={!ready || busy}>Save teams</button><button className="primary-button" onClick={start} disabled={!ready || busy}>{ready ? "Start game" : `${4 - game.players.length} more to join`}</button></div></> : <p className="waiting">Waiting for the host to set the teams and begin…</p>}
  </section>;
}

function AnswerPhase({ game, prompt, answer, setAnswer, submitted, remainingSeconds, submit, busy }: { game: GameState; prompt: string; answer: string; setAnswer: (value: string) => void; submitted: boolean; remainingSeconds: number; submit: () => void; busy: boolean }) {
  return <section className="panel round-panel"><div className={`timer ${remainingSeconds <= 10 ? "danger" : ""}`}><span>TIME LEFT</span><strong>0:{String(remainingSeconds).padStart(2, "0")}</strong></div><p className="eyebrow">ROUND {game.room.roundNumber} OF {game.room.roundLimit}</p><h2>{prompt}</h2><p className="muted">You and your teammate are answering independently. Don&apos;t give anything away.</p><div className="answer-box"><input value={answer} maxLength={120} disabled={submitted || busy} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} placeholder="Type your best guess..." /><button className="primary-button" disabled={!answer.trim() || submitted || busy} onClick={submit}>{submitted ? "Locked in" : busy ? "Saving..." : "Lock it in"}</button></div><div className="submission-status"><strong>{game.answerCount}/4</strong> answers locked in <span>•</span> Everyone sees results together</div></section>;
}

function VotingPhase({ game, vote, busy }: { game: GameState; vote: (team: Team, counts: boolean) => void; busy: boolean }) {
  return <section className="panel voting"><p className="eyebrow">JURY DUTY</p><h2>Do these answers mean the same thing?</h2><p className="muted">A close match needs at least 3 out of 4 votes to earn the point.</p><Results game={game} showVote vote={vote} busy={busy} /></section>;
}

function RevealPhase({ game, isHost, next, rematch, remakeTeams, busy }: { game: GameState; isHost: boolean; next: () => void; rematch: () => void; remakeTeams: () => void; busy: boolean }) {
  const winner = game.room.phase === "finished" ? (game.room.scoreA === game.room.scoreB ? "It’s a tie!" : game.room.scoreA > game.room.scoreB ? "Team Tropic wins!" : "Team Thunder wins!") : "Round results";
  return <section className="panel reveal"><p className="eyebrow">{game.room.phase === "finished" ? "FINAL SCORE" : "THE REVEAL"}</p><h2>{winner}</h2><Results game={game} showVote={false} vote={() => undefined} busy={busy} />{isHost && game.room.phase === "reveal" && <button className="primary-button next-button" onClick={next} disabled={busy}>{game.room.roundNumber === game.room.roundLimit ? "See final score" : "Next round"}</button>}{!isHost && game.room.phase === "reveal" && <p className="waiting">Waiting for the host to start the next round…</p>}{isHost && game.room.phase === "finished" && <div className="host-actions final-actions"><button className="secondary-button" onClick={remakeTeams} disabled={busy}>Remake teams</button><button className="primary-button" onClick={rematch} disabled={busy}>Rematch</button></div>}{!isHost && game.room.phase === "finished" && <p className="waiting">Waiting for the host to choose the next game…</p>}</section>;
}

function Results({ game, showVote, vote, busy }: { game: GameState; showVote: boolean; vote: (team: Team, counts: boolean) => void; busy: boolean }) {
  return <div className="result-grid">{game.teamResults.map((result) => <article className={`result-card ${result.team === "a" ? "tropic" : "thunder"}`} key={result.team}><div className="result-head"><span>{teamName(result.team)}</span><strong>{result.counted === true ? "+1 POINT" : result.counted === false ? "NO POINT" : "VOTE OPEN"}</strong></div><p className="result-prompt">{result.prompt}</p>{result.answers.map((entry) => <div className="answer-reveal" key={entry.playerId}><span>{entry.playerName}</span><strong>{entry.answer || "No answer"}</strong></div>)}{showVote && result.needsVote && <div className="vote-block">{result.myVote === null ? <><p>Should this count as a match?</p><button onClick={() => vote(result.team, true)} disabled={busy}>Yes, count it</button><button className="no-button" onClick={() => vote(result.team, false)} disabled={busy}>No match</button></> : <p>Your vote is in. <strong>{result.votesTotal}/4</strong> votes received.</p>}</div>}{result.exactMatch && <p className="match-label">Exact match — point awarded!</p>}{!showVote && !result.exactMatch && <p className="match-label">{result.votesFor}/4 voted to count it</p>}</article>)}</div>;
}
