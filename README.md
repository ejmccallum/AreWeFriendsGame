# Are We Friends?

A 2v2 online guessing game for four friends. Teammates independently answer the same question about one teammate. Exact matches score automatically; close matches go to a four-player vote and need three yes votes to count.

## Run locally

1. Create a Supabase project and run [`supabase/schema.sql`](./supabase/schema.sql) in its SQL editor.
2. Copy `.env.example` to `.env.local`, then add the project URL and **service role** key. Keep this key server-only and never put it in browser code.
3. Run `npm install`, then `npm run dev`.

## Deploy

Push this project to GitHub, import it in Vercel, and add the same two environment variables in Vercel's project settings. Every deployment receives a shareable URL.

## Rules

- A round lasts 60 seconds by default; the host can select 30, 60, or 90 seconds before starting.
- On timeout, unanswered players receive a blank answer and the game moves to the reveal/voting phase.
- Exact normalized answers score automatically. Different wording can be approved by a vote of at least three of the four players.
