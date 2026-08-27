# NOVI

NOVI is an AI personal intelligence environment that turns connected work data into a source-backed Life Canvas. It combines Google, GitHub, search, sync status, attention surfaces, and contextual command flows in one responsive web app.

Live deployment:

https://life-canvas-os.jobsuit-0163.chatgpt.site

## What It Does

- Connects Google and GitHub accounts through OAuth.
- Syncs Gmail, Calendar, Drive, repositories, issues, pull requests, and commits into normalized source entities.
- Separates Demo Mode from Connected Mode so real connected data is never mixed with demo records.
- Shows connected objects in a readable source map built for long file names and real-world data.
- Provides working navigation for Canvas, Attention, Projects, People, and Docs views.
- Offers an Ask Novi command surface with local matching and source-backed connected search.
- Tracks provider state, sync state, errors, source metadata, and relationship data.
- Uses D1 for users, connected accounts, sync jobs, entities, relationships, search index, and action history.

## Tech Stack

- Next.js / React
- Vinext build output for Sites
- Cloudflare Workers runtime
- Cloudflare D1
- Drizzle ORM
- TypeScript
- Tailwind CSS

## Project Structure

```text
app/
  api/                 API routes for OAuth, sync, search, actions, and webhooks
  lib/server/          Server-side data, OAuth, Google sync, and GitHub sync logic
  globals.css          NOVI visual system and responsive UI styles
  layout.tsx           App metadata, manifest, and icons
  page.tsx             Main NOVI experience
db/
  schema.ts            Database schema
drizzle/
  *.sql                Generated migrations
public/
  favicon.svg          NOVI app icon
tests/
  rendered-html.test.mjs
```

## Environment Variables

Copy `.env.example` for local development and configure these values in Sites production environment variables:

```bash
CREDENTIAL_ENCRYPTION_KEY="at-least-32-random-characters"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GITHUB_WEBHOOK_SECRET=""
OPENAI_API_KEY=""
```

Never commit real secret values.

## Local Development

```bash
npm install
npm run db:generate
npm run dev
```

Useful checks:

```bash
npm run build
npm run test
npm run lint
```

## Google Setup

1. Create or select a Google Cloud project.
2. Enable Gmail API, Google Calendar API, and Google Drive API.
3. Configure the OAuth consent screen.
4. Create an OAuth web client.
5. Add redirect URLs:
   - Local: `http://localhost:5173/api/connect/google/callback`
   - Production: `https://life-canvas-os.jobsuit-0163.chatgpt.site/api/connect/google/callback`
6. Add the client ID and secret to your environment variables.

Requested scopes:

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/drive.metadata.readonly`
- `https://www.googleapis.com/auth/drive.readonly`

## GitHub Setup

For OAuth:

1. Create a GitHub OAuth App.
2. Add callback URLs:
   - Local: `http://localhost:5173/api/connect/github/callback`
   - Production: `https://life-canvas-os.jobsuit-0163.chatgpt.site/api/connect/github/callback`
3. Add the client ID and secret to your environment variables.

For webhook ingestion:

1. Configure the webhook target:
   - `https://life-canvas-os.jobsuit-0163.chatgpt.site/api/webhooks/github`
2. Set the same secret in GitHub and `GITHUB_WEBHOOK_SECRET`.
3. Subscribe to push, pull request, issue, issue comment, release, and review events as needed.

The webhook route verifies `x-hub-signature-256` before accepting payloads.

## Data Model

Provider objects are normalized into NOVI entities:

- Emails and threads become conversations, people, activities, tasks, and source-backed search records.
- Calendar events become meetings/events with attendees, timestamps, recurrence metadata, and relationships.
- Drive files become documents with source IDs, links, metadata, and indexed content.
- GitHub repositories, commits, issues, and pull requests become repositories, activities, tasks, work items, and people.

Every imported object should retain provider, provider ID, source URL, timestamps, and sync metadata.

## Deployment

The site uses Sites with D1 binding `DB`, declared in `.openai/hosting.json`.

Production environment values should be configured through Sites, not committed to source.

## Safety Notes

- Connected Mode should never silently fall back to demo data.
- External actions must be recorded in `action_history` as proposed actions first.
- External writes should only run after explicit user confirmation.
- OAuth failures should surface as readable source status, not fake connection progress.
