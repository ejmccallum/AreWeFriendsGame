"use client";

import { questionPackDetails, type GameMode, type GameState, type QuestionPack, type Team } from "@/lib/game";

function teamName(team: Team) {
  return team === "a" ? "Team Tropic" : "Team Thunder";
}

type Props = {
  game: GameState;
  teams: Record<string, Team>;
  isHost: boolean;
  gameMode: GameMode;
  questionPack: QuestionPack;
  roundsPerPlayer: number;
  durationSeconds: number;
  roundLimit: number;
  setTeams: (teams: Record<string, Team>) => void;
  setGameMode: (mode: GameMode) => void;
  setQuestionPack: (pack: QuestionPack) => void;
  setRoundsPerPlayer: (rounds: number) => void;
  setDurationSeconds: (value: number) => void;
  setRoundLimit: (value: number) => void;
  assign: () => void;
  start: () => void;
  busy: boolean;
};

export function ModeLobby({ game, teams, isHost, gameMode, questionPack, roundsPerPlayer, durationSeconds, roundLimit, setTeams, setGameMode, setQuestionPack, setRoundsPerPlayer, setDurationSeconds, setRoundLimit, assign, start, busy }: Props) {
  const ready = gameMode === "teams" ? game.players.length === 4 : game.players.length >= 2 && game.players.length <= 8;
  const needed = gameMode === "teams" ? Math.abs(4 - game.players.length) : Math.max(0, 2 - game.players.length);

  return <section className="panel lobby"><p className="eyebrow">THE LOBBY</p><h2>Choose the challenge</h2><p className="muted">Share code <strong>{game.room.code}</strong>. Pick a mode, then get everyone ready.</p>
    {isHost && <div className="mode-picker"><button className={gameMode === "teams" ? "mode-card selected" : "mode-card"} onClick={() => setGameMode("teams")}><strong>2v2</strong><span>Four friends, two teams, shared guesses.</span></button><button className={gameMode === "spotlight" ? "mode-card selected" : "mode-card"} onClick={() => setGameMode("spotlight")}><strong>Spotlight</strong><span>2–8 friends rotate as the answerer. Match their answer to score.</span></button></div>}
    <div className="players">{game.players.map((player) => <div className="player-row" key={player.id}><span className="avatar">{player.displayName.slice(0, 1)}</span><strong>{player.displayName}</strong>{gameMode === "teams" && isHost ? <select value={teams[player.id] ?? "a"} onChange={(event) => setTeams({ ...teams, [player.id]: event.target.value as Team })}><option value="a">{teamName("a")}</option><option value="b">{teamName("b")}</option></select> : <span className="team-pill">{gameMode === "spotlight" ? "Ready to rotate" : player.team ? teamName(player.team) : "Waiting for host"}</span>}</div>)}</div>
    {isHost ? <><div className="settings"><label>Question pack<select value={questionPack} onChange={(event) => setQuestionPack(event.target.value as QuestionPack)}>{(Object.keys(questionPackDetails) as QuestionPack[]).map((pack) => <option key={pack} value={pack}>{questionPackDetails[pack].label}</option>)}</select><span className="setting-description">{questionPackDetails[questionPack].description}</span></label><label>Round time<select value={durationSeconds} onChange={(event) => setDurationSeconds(Number(event.target.value))}><option value={30}>30 seconds</option><option value={60}>60 seconds</option><option value={90}>90 seconds</option></select></label>{gameMode === "teams" ? <label>Rounds<select value={roundLimit} onChange={(event) => setRoundLimit(Number(event.target.value))}><option value={4}>4 rounds</option><option value={6}>6 rounds</option><option value={8}>8 rounds</option><option value={10}>10 rounds</option></select></label> : <label>Rounds each<select value={roundsPerPlayer} onChange={(event) => setRoundsPerPlayer(Number(event.target.value))}><option value={3}>3 rounds each</option><option value={4}>4 rounds each</option><option value={5}>5 rounds each</option><option value={6}>6 rounds each</option></select></label>}</div><div className="host-actions">{gameMode === "teams" && <button className="secondary-button" onClick={assign} disabled={!ready || busy}>Save teams</button>}<button className="primary-button" onClick={start} disabled={!ready || busy}>{ready ? `Start ${gameMode === "teams" ? "2v2" : "Spotlight"}` : gameMode === "teams" ? "Need exactly 4 players" : `${needed} more to join`}</button></div></> : <p className="waiting">Waiting for the host to choose a mode and begin…</p>}
  </section>;
}
