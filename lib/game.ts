export type Team = "a" | "b";
export type Phase = "lobby" | "answering" | "voting" | "reveal" | "finished";

export type Player = {
  id: string;
  displayName: string;
  team: Team | null;
  joinedAt: string;
};

export type Room = {
  code: string;
  hostPlayerId: string;
  phase: Phase;
  roundNumber: number;
  roundLimit: number;
  roundStartedAt: string | null;
  durationSeconds: number;
  scoreA: number;
  scoreB: number;
};

export type TeamResult = {
  team: Team;
  targetName: string;
  prompt: string;
  answers: { playerId: string; playerName: string; answer: string }[];
  exactMatch: boolean;
  needsVote: boolean;
  votesFor: number;
  votesTotal: number;
  myVote: boolean | null;
  counted: boolean | null;
};

export type GameState = {
  room: Room;
  players: Player[];
  me: Player;
  answerCount: number;
  hasAnswered: boolean;
  teamResults: TeamResult[];
};

export const questionTemplates = [
  "Where is one place {name} would most want to visit?",
  "What is {name}'s ideal Friday night?",
  "What food could {name} eat every day?",
  "What is {name}'s most-used phrase?",
  "What is {name}'s dream job?",
  "What movie could {name} watch over and over?",
  "What is {name}'s biggest pet peeve?",
  "What is {name}'s go-to drink order?",
  "What would {name} spend a surprise $1,000 on?",
  "What is {name}'s most likely karaoke song?"
];

export function promptFor(name: string, roundNumber: number) {
  return questionTemplates[(roundNumber - 1) % questionTemplates.length].replace("{name}", name);
}

export function normalizeAnswer(answer: string) {
  return answer
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}
