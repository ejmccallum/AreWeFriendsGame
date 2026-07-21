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
  "What conspiracy theory does {name} actually believe?",
  "If {name} was an animal, what would they be?",
  "What body part is {name} secretly most insecure about?",
  "What is {name} dick size?",
  "What excuse does {name} usually give when they are running late?",
"What nervous habit does {name} have?",
"What can instantly improve {name}'s mood?",
"What is {name}'s guilty-pleasure TV show?",
"What meal does {name} consider the ultimate comfort food?",
"What food would {name} refuse to share with anyone?",
"What special request would {name} make at a restaurant?",
"What meal does {name} cook the best?",
"What cooking disaster is {name} most likely to cause?",
"What chore does {name} avoid for as long as possible?",
"What purchase does {name} regret the most?",
"What does {name}'s paycheck disappear on the fastest?",
"What subscription does {name} keep forgetting to cancel?",
"What irresponsible purchase would {name} still defend?",
"What basic adult responsibility does {name} struggle with the most?",
"What unusual feature would {name} add to their dream home?",
"How would {name} spend an unexpected day off?",
"What small luxury makes {name} feel rich?",
"What ridiculous thing did {name} believe as a child?",
"What would {name} have gotten in trouble for at school?",
"What would {name}'s yearbook quote say?",
"What would {name}'s teachers remember most about them?",
"What was {name} completely obsessed with as a child?",
"What embarrassing username would {name} have used when they were younger?",
"What old fashion choice does {name} regret the most?",
"What clothing item does {name} own way too many of?",
"What is {name}'s most irrational fear?",
"What would {name} contribute during an escape room?",
"What simple question would make {name} lose on a game show?",
"What reality show would {name} be perfect for?",
"What topic could {name} give an unprepared TED Talk about?",
"What funny award would the friend group give {name}?",
"What would {name}'s warning label say?",
"What would {name}'s villain origin story be?",
"What completely useless superpower would fit {name}?",
"What would {name} name a restaurant based on their personality?",
"What signature item would appear on {name}'s restaurant menu?",
"What ridiculous name would {name} give a new pet?",
"How would {name} react after discovering a ghost in their home?",
"What would {name} tell aliens about life on Earth?",
"What responsibility would {name} naturally take during a road trip?",
"What would {name} do after getting lost in an unfamiliar city?",
"How would {name} entertain everyone during a long flight delay?",
"What important item would {name} forget to pack for vacation?",
"What would an Uber driver mention when rating {name}?",
"What does {name} usually do during a family gathering?",
"Where does {name} disappear to during a party?",
"What does {name} consider the best hangover cure?",
"What kind of text would {name} send after a few drinks?",
"What makes it obvious that {name} is trying to flirt?",
"What dating red flag would {name}'s friends notice before they do?",
"What excuse would {name} use to escape a terrible date?",
"How would one of {name}'s exes describe them?",
"What would {name}'s social media algorithm reveal about them?",
"What app is responsible for most of {name}'s screen time?",
"What kind of browser tab does {name} always leave open?",
"What strange entry is probably hidden in {name}'s Notes app?",
"What explanation would {name} give for all their unread messages?",
"What contact name would friends save {name} under?",
"What would the last photo in {name}'s camera roll reveal?",
"What completely unimportant activity makes {name} extremely competitive?",
"What gives {name} away when they are lying?",
"What story does {name} exaggerate every time they tell it?",
"What would {name} say after being caught doing something embarrassing?",
"What does {name}'s typical apology sound like?",
"What behavior reveals that {name} is stressed?",
"How does {name} show someone that they care?",
"What favor do friends most commonly ask {name} to do?",
"What item would {name} borrow and forget to return?",
"What does {name} do that always makes their friends laugh?"
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
