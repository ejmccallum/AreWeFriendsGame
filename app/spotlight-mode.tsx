"use client";

import { type GameState } from "@/lib/game";

type AnswerProps = {
  game: GameState;
  prompt: string;
  answer: string;
  setAnswer: (value: string) => void;
  submitted: boolean;
  remainingSeconds: number;
  submit: () => void;
  busy: boolean;
};

export function SpotlightAnswerPhase({ game, prompt, answer, setAnswer, submitted, remainingSeconds, submit, busy }: AnswerProps) {
  const answerer = game.spotlight?.answerer;
  const isAnswerer = answerer?.id === game.me.id;
  return <section className="panel round-panel spotlight-round"><div className={`timer ${remainingSeconds <= 10 ? "danger" : ""}`}><span>TIME LEFT</span><strong>0:{String(remainingSeconds).padStart(2, "0")}</strong></div><p className="eyebrow">SPOTLIGHT · TURN {game.spotlight?.turnForAnswerer} OF {game.room.roundsPerPlayer} FOR {answerer?.displayName.toUpperCase()}</p><h2>{prompt}</h2><p className="muted">{isAnswerer ? "You are the answerer. Write your real answer—everyone else is trying to match it." : `${answerer?.displayName} is the answerer. Write the answer you think they will give.`}</p><div className="answer-box"><input value={answer} maxLength={120} disabled={submitted || busy} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} placeholder={isAnswerer ? "Your real answer..." : "Your best guess..."} /><button className="primary-button" disabled={!answer.trim() || submitted || busy} onClick={submit}>{submitted ? "Locked in" : busy ? "Saving..." : "Lock it in"}</button></div><div className="submission-status"><strong>{game.answerCount}/{game.players.length}</strong> answers locked in <span>•</span> The answerer earns no point this turn</div></section>;
}

type RevealProps = {
  game: GameState;
  isHost: boolean;
  next: () => void;
  rematch: () => void;
  returnToLobby: () => void;
  busy: boolean;
};

export function SpotlightReveal({ game, isHost, next, rematch, returnToLobby, busy }: RevealProps) {
  const isFinished = game.room.phase === "finished";
  const rankings = game.players.slice().sort((first, second) => second.score - first.score);
  const answerer = game.spotlight?.answerer;
  return <section className="panel reveal spotlight-reveal"><p className="eyebrow">{isFinished ? "FINAL RANKINGS" : "SPOTLIGHT REVEAL"}</p><h2>{isFinished ? "Who knows their friends best?" : `${answerer?.displayName}'s answer`}</h2>{isFinished ? <ol className="rankings">{rankings.map((player, index) => <li key={player.id}><span>{index + 1}</span><strong>{player.displayName}</strong><em>{player.score} points</em></li>)}</ol> : <><p className="muted">Correct matches earn one point. {answerer?.displayName} sets the answer this turn.</p><div className="spotlight-results">{game.spotlight?.entries.map((entry) => <div className={entry.playerId === answerer?.id ? "spotlight-entry answerer" : entry.matched ? "spotlight-entry matched" : "spotlight-entry"} key={entry.playerId}><span>{entry.playerName}{entry.playerId === answerer?.id ? " · Answerer" : ""}</span><strong>{entry.answer || "No answer"}</strong><em>{entry.playerId === answerer?.id ? "The answer" : entry.matched ? "+1 point" : "No point"}</em></div>)}</div></>}{isHost && !isFinished && <button className="primary-button next-button" onClick={next} disabled={busy}>{game.room.roundNumber === game.room.roundLimit ? "See final rankings" : "Next turn"}</button>}{!isHost && !isFinished && <p className="waiting">Waiting for the host to start the next turn…</p>}{isHost && isFinished && <div className="host-actions final-actions"><button className="secondary-button" onClick={returnToLobby} disabled={busy}>Back to lobby</button><button className="primary-button" onClick={rematch} disabled={busy}>Rematch</button></div>}{!isHost && isFinished && <p className="waiting">Waiting for the host to choose the next game…</p>}</section>;
}
