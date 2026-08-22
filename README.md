# Life Canvas OS

Life Canvas OS is a personal operating system prototype. The current interface stays centered on the Life Canvas, while the backend now separates Demo Mode from Connected Mode.

## What Is Implemented

- D1-backed tables for users, connected accounts, sync jobs, normalized entities, relationships, search index, and action history.
- Google OAuth start and callback routes for Gmail, Calendar, and Drive scopes.
- GitHub OAuth start and callback routes.
- Server-side credential encryption using `CREDENTIAL_ENCRYPTION_KEY`.
- Connection status, disconnect, source-backed search, action proposal, and GitHub webhook routes.
- A subtle source ribbon in the existing UI that shows Demo Mode or Connected Mode and starts provider connection flows.

The app does not claim a provider is connected unless OAuth succeeds and the account is persisted. If credentials are missing, the connection routes record an error instead of faking progress.

## Environment Variables

Copy `.env.example` and configure these values in local development and Sites production environment variables:

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

## Google Cloud Setup

1. Create or select a Google Cloud project.
2. Enable Gmail API, Google Calendar API, and Google Drive API.
3. Configure the OAuth consent screen.
4. Create an OAuth web client.
5. Add redirect URLs:
   - Local: `http://localhost:5173/api/connect/google/callback`
   - Production: `https://life-canvas-os.jobsuit-0163.chatgpt.site/api/connect/google/callback`
6. Add the client ID and secret to environment variables.

Current requested scopes:

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/drive.metadata.readonly`
- `https://www.googleapis.com/auth/drive.readonly`

## GitHub Setup

For the current OAuth route:

1. Create a GitHub OAuth App.
2. Add callback URLs:
   - Local: `http://localhost:5173/api/connect/github/callback`
   - Production: `https://life-canvas-os.jobsuit-0163.chatgpt.site/api/connect/github/callback`
3. Add the client ID and secret to environment variables.

For webhook ingestion:

1. Configure a webhook target:
   - `https://life-canvas-os.jobsuit-0163.chatgpt.site/api/webhooks/github`
2. Set the same secret in GitHub and `GITHUB_WEBHOOK_SECRET`.
3. Subscribe to push, pull request, issue, issue comment, release, and review events as needed.

The webhook route verifies `x-hub-signature-256` before accepting a payload.

## Data Model

Provider objects are not the core model. They are normalized into Life Canvas entities:

- Email and thread data become conversations, people, activities, tasks, and source-backed search records.
- Calendar events become meetings/events with attendees, timestamps, recurrence metadata, and relationships.
- Drive files become documents with source IDs, links, metadata, and indexed content.
- GitHub repositories, commits, issues, and pull requests become repositories, activities, tasks, work items, and people.

Every imported object should retain provider, provider ID, source URL, timestamps, and sync metadata.

## Sync Roadmap

The current implementation persists connection state and queues initial sync jobs. Production sync workers should:

1. Read queued jobs from `sync_jobs`.
2. Refresh provider tokens when needed.
3. Fetch incremental Gmail, Calendar, Drive, or GitHub data.
4. Upsert normalized `entities`.
5. Upsert `relationships` with confidence and evidence.
6. Update `search_index`.
7. Advance provider cursors/history IDs.
8. Mark jobs complete or error with a clear message.

Do not silently fall back to demo data in Connected Mode.

## Local Development

```bash
npm install
npm run db:generate
npm run dev
npm run build
```

## Production

The site uses Sites D1 binding `DB`, declared in `.openai/hosting.json`. Configure production environment variables through Sites, not by committing `.env` files.

External actions must go through `action_history` as proposed actions first. Only execute external writes after explicit user confirmation.
