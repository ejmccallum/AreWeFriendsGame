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
  "What is {name}'s most likely karaoke song?",
  "What childhood memory always makes {name} smile?",
"What would {name}'s perfect vacation look like?",
"What is the first thing {name} would do after winning the lottery?",
"What is {name}'s hidden talent?",
"What TV show makes {name} completely lose track of time?",
"What is {name}'s favorite late-night snack?",
"What is {name}'s most irrational fear?",
"What moment made {name} feel the happiest?",
"What is {name}'s favorite holiday tradition?",
"What is the first thing {name} does after waking up?",
"What is {name}'s favorite comfort food?",
"What phone app does {name} use the most?",
"What animal best matches {name}'s personality?",
"What does {name}'s dream car look like?",
"What fictional character does {name} relate to the most?",
"What habit does {name} wish they could break?",
"What does {name} usually order on a pizza?",
"What type of music does {name} listen to while driving?",
"What compliment means the most to {name}?",
"What subject was {name} best at in school?",
"What chore does {name} procrastinate on the most?",
"How would {name} spend their first day stranded on an island?",
"What would {name}'s ideal birthday celebration look like?",
"What is {name} most likely to purchase impulsively?",
"What activity brings out {name}'s competitive side?",
"What always makes {name} laugh?",
"What is the fastest way to cheer {name} up?",
"What accomplishment is {name} most proud of?",
"What is at the top of {name}'s bucket list?",
"What outfit does {name} wear the most?",
"What does perfect weather look like to {name}?",
"What meal does {name} cook the best?",
"How does {name} usually celebrate good news?",
"What emoji does {name} use the most?",
"How does {name} usually ask for advice?",
"What is something {name} enjoys collecting?",
"What board game is {name} surprisingly good at?",
"What is {name}'s guilty-pleasure song?",
"What piece of advice does {name} give the most?",
"What area of {name}'s home gets messy the fastest?",
"What drink does {name} usually have in the morning?",
"What role does {name} naturally take during a road trip?",
"What does {name} usually do when they arrive at a party?",
"How far ahead does {name} usually plan their weekends?",
"What is {name}'s best personality trait?",
"What is {name} most stubborn about?",
"What historical event fascinates {name} the most?",
"What sports memory stands out most to {name}?",
"What does {name} normally do on a weekend morning?",
"What skill does {name} want to improve?",
"What would {name} most likely become famous for?",
"What is something {name} never leaves the house without?",
"What smell reminds {name} of home?",
"What show did {name} love watching as a child?",
"What is {name}'s favorite kind of candy?",
"What is {name}'s usual fast-food order?",
"What would {name}'s perfect summer day look like?",
"What is {name} always willing to spend extra money on?",
"What is {name} surprisingly good at saving money on?",
"What is {name} most likely to be late for?",
"What role would {name} take during a zombie apocalypse?",
"How would {name} behave on a reality competition show?",
"What unusual reason could get {name} into trouble?",
"What funny award would {name}'s friends give them?",
"What would the title of a book about {name}'s life be?",
"What does a typical text from {name} look like?",
"What song always gets {name} onto the dance floor?",
"What would {name} do first in a horror movie?",
"What role does {name} play in the group chat?",
"What topic could {name} argue about for hours?",
"What always makes {name} break a straight face?",
"How does {name} react when someone tells them a secret?",
"How does {name} normally apologize after an argument?",
"What is most likely to make {name} hold a grudge?",
"Who is {name}'s celebrity crush?",
"What nickname do people call {name} the most?",
"What would {name}'s signature dish be?",
"What random topic does {name} know a surprising amount about?",
"What subject could {name} discuss for hours?",
"What is {name}'s weirdest habit?",
"What does {name} usually say when they are annoyed?",
"What luxury item would fit {name}'s lifestyle perfectly?",
"What is currently on {name}'s phone wallpaper?",
"How does {name} normally react when someone takes their picture?",
"What would {name}'s dream home look like?",
"What would {name}'s dream pet be like?",
"What color best represents {name}'s personality?",
"What kind of tattoo fits {name}'s personality?",
"What does {name} like most about their name?",
"What dream does {name} hope comes true someday?",
"How would {name} handle going a month without their phone?",
"How does {name} show people that they care?",
"What kind of problem do friends usually ask {name} to help solve?",
"How would {name} react to a surprise party?",
"What does {name} most want to be remembered for?",
"What embarrassing story does {name} tell the most?",
"What does {name} consider their biggest weakness?",
"How does {name} act when they are stressed?",
"What small thing can instantly improve {name}'s day?",
"What personal goal is {name} currently working toward?"
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
