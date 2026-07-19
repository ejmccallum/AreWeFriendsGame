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
  gameSeed: string;
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
  currentPrompt: string | null;
  teamResults: TeamResult[];
};

export const questionTemplates = [
  "Where is one place {name} would most want to visit?",
  "What is {name}'s most-used phrase?",
  "What is {name}'s dream job?",
  "What movie could {name} watch over and over?",
  "What is {name}'s biggest pet peeve?",
  "What is {name}'s favorite song?",
"What is the first thing {name} would do after winning the lottery?",
"What is {name}'s hidden talent?",
"What fictional character does {name} relate to the most?",
"What subject was {name} best at in school?",
"How would {name} spend their first day stranded on an island?",
"What is {name} most likely to purchase impulsively?",
"What does {name} usually do when they arrive at a party?",
"What is {name}'s best personality trait?",
"What is {name} most stubborn about?",
"What does {name} normally do on a weekend morning?",
"What would {name} most likely become famous for?",
"What is something {name} never leaves the house without?",
"What role would {name} take during a zombie apocalypse?",
"What song always gets {name} onto the dance floor?",
"What would {name} do first in a horror movie?",
"What role does {name} play in the group chat?",
"Who is {name}'s celebrity crush?",
"What nickname do people call {name} the most?",
"What random topic does {name} know a surprising amount about?",
"What subject could {name} discuss for hours?",
"What is {name}'s weirdest habit?",
"What kind of problem do friends usually ask {name} to help solve?",
"What does {name} consider their biggest weakness?",
"What would {name}'s friends have to stop them from doing at a party?",
"What would {name} say the morning after a chaotic night out?",
"What would {name} become overly confident about after two drinks?",
"What would {name} spend their last $20 on?",
"What would {name}'s search history reveal about them?",
"What would {name} go viral on TikTok for?",
"What would cause {name} to get kicked out of a fancy restaurant?",
"What would {name} most likely get arrested for?",
"What is {name} most likely to yell during an argument?",
"What would {name} rate themselves out of 10",
"What has {name} been confidently wrong about?",
"What dance move does {name} always bring out?",
"What random items are probably inside {name}'s car right now?",
"What would someone find the most of in {name}'s camera roll?",
"What tiny inconvenience makes {name} way angrier than it should?",
"What moment from a night out will the group never let {name} forget?",
"What roast about {name} is funny because it is completely true?",
"What score would {name} shoot in a golf round?",
"What video game is {name} best at?",
"What rating would an uber driver give {name} as a passenger?",
"Where did you first meet {name}?",
"What is {name}'s hottest take?",
];

function createSeededRandom(seed: string) {
  let state = 2166136261;
  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledQuestionIndexes(gameSeed: string) {
  const indexes = questionTemplates.map((_, index) => index);
  const random = createSeededRandom(gameSeed);
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]];
  }
  return indexes;
}

export function promptFor(name: string, gameSeed: string, roundNumber: number) {
  const indexes = shuffledQuestionIndexes(gameSeed);
  const questionIndex = indexes[(roundNumber - 1) % indexes.length];
  return questionTemplates[questionIndex].replace("{name}", name);
}

export function normalizeAnswer(answer: string) {
  return answer
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}
