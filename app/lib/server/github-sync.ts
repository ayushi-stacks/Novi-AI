import { upsertSourceEntity } from "./data";

// This module owns the GitHub REST calls used by /api/sync/github. It
// deliberately favors the account-wide endpoints (GET /issues, GET
// /search/commits) over looping through every repo the user can see: they
// return only what the user is actually involved in, which matches the
// product's "context, not dashboard" goal and avoids an N-repo fan-out of
// requests on every sync.

export type GithubCursor = {
  issuesSince?: string;
  commitsSince?: string;
};

export function parseGithubCursor(raw: string | null | undefined): GithubCursor {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as GithubCursor) : {};
  } catch {
    return {};
  }
}

export function serializeGithubCursor(cursor: GithubCursor) {
  return JSON.stringify(cursor);
}

// GitHub OAuth App tokens don't expire and there is no refresh grant, so
// unlike Google a 401 here just means "reconnect" -- there's nothing to
// retry.
export class GithubAuthError extends Error {}

type HttpError = Error & { status?: number };

async function githubFetch<T>(url: string, accessToken: string, accept = "application/vnd.github+json"): Promise<T> {
  const backoffMs = [400, 1200, 2500];
  let attempt = 0;

  while (true) {
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept,
        "x-github-api-version": "2022-11-28",
      },
    });
    if (response.ok) return response.json() as Promise<T>;

    if (response.status === 401) throw new GithubAuthError("GitHub access token was rejected.");

    const rateLimited = response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0";
    if ((response.status === 429 || response.status >= 500 || rateLimited) && attempt < backoffMs.length) {
      await new Promise((resolve) => setTimeout(resolve, backoffMs[attempt]));
      attempt += 1;
      continue;
    }

    const text = await response.text();
    const error = new Error(`GitHub API request failed (${response.status}): ${text.slice(0, 200)}`) as HttpError;
    error.status = response.status;
    throw error;
  }
}

export async function fetchGithubProfile(accessToken: string) {
  return githubFetch<{ login: string; email?: string | null; name?: string | null }>(
    "https://api.github.com/user",
    accessToken,
  );
}

type SyncResult = { count: number; error: string | null };

// --- Repositories ----------------------------------------------------------
// Cheap enough (bounded to 20, sorted by recent push) to fully refresh every
// sync rather than needing an incremental cursor.

type GithubRepo = {
  id: number;
  full_name: string;
  html_url: string;
  description?: string | null;
  private: boolean;
  language?: string | null;
  pushed_at?: string | null;
  default_branch?: string;
  open_issues_count?: number;
  stargazers_count?: number;
};

async function upsertRepo(userId: string, repo: GithubRepo) {
  await upsertSourceEntity({
    userId,
    type: "repository",
    title: repo.full_name,
    summary: repo.description || `${repo.private ? "Private" : "Public"} repository`,
    body: `Default branch ${repo.default_branch ?? "unknown"}. ${repo.open_issues_count ?? 0} open issues, ${
      repo.stargazers_count ?? 0
    } stars.`,
    provider: "github",
    providerId: `repo:${repo.id}`,
    sourceUrl: repo.html_url,
    sourceUpdatedAt: repo.pushed_at ?? null,
    metadata: { private: repo.private, language: repo.language, openIssues: repo.open_issues_count },
  });
}

export async function syncRepositories(userId: string, accessToken: string): Promise<SyncResult> {
  try {
    const repos = await githubFetch<GithubRepo[]>(
      "https://api.github.com/user/repos?sort=pushed&direction=desc&per_page=20&affiliation=owner,collaborator,organization_member",
      accessToken,
    );
    for (const repo of repos) {
      await upsertRepo(userId, repo);
    }
    return { count: repos.length, error: null };
  } catch (error) {
    if (error instanceof GithubAuthError) throw error;
    return { count: 0, error: error instanceof Error ? error.message : "Repository sync failed." };
  }
}

// --- Issues + pull requests --------------------------------------------
// GET /issues (account-scoped, not /repos/{o}/{r}/issues) returns issues AND
// pull requests the user is involved in across every repo they can see, and
// supports `since` for real incremental sync -- no per-repo looping needed.
// Both map to the existing "task" entity type; metadata.kind distinguishes
// them (the Life Canvas type system doesn't yet have a separate PR type).

type GithubIssue = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  body?: string | null;
  updated_at: string;
  pull_request?: unknown;
  user?: { login?: string };
  repository?: { full_name?: string };
  labels?: (string | { name?: string })[];
};

async function upsertIssue(userId: string, issue: GithubIssue) {
  const isPr = Boolean(issue.pull_request);
  const repoName = issue.repository?.full_name ?? "a repository";
  await upsertSourceEntity({
    userId,
    type: "task",
    title: issue.title,
    summary: `${isPr ? "Pull request" : "Issue"} in ${repoName} (${issue.state})`,
    body: (issue.body ?? "").slice(0, 500),
    provider: "github",
    providerId: `${isPr ? "pr" : "issue"}:${issue.id}`,
    sourceUrl: issue.html_url,
    sourceUpdatedAt: issue.updated_at,
    metadata: {
      kind: isPr ? "pull_request" : "issue",
      state: issue.state,
      repository: repoName,
      author: issue.user?.login,
      labels: (issue.labels ?? []).map((label) => (typeof label === "string" ? label : label.name)),
    },
  });
}

export async function syncIssuesAndPRs(
  userId: string,
  accessToken: string,
  since: string | undefined,
): Promise<SyncResult & { since?: string }> {
  let count = 0;
  let latest = since;
  try {
    // Bound the very first sync to the last 90 days instead of the user's
    // entire GitHub history.
    const effectiveSince = since ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    let page = 1;
    const maxPages = 3;

    while (page <= maxPages) {
      const url = new URL("https://api.github.com/issues");
      url.searchParams.set("filter", "involves");
      url.searchParams.set("state", "all");
      url.searchParams.set("sort", "updated");
      url.searchParams.set("direction", "desc");
      url.searchParams.set("per_page", "50");
      url.searchParams.set("page", String(page));
      url.searchParams.set("since", effectiveSince);

      const items = await githubFetch<GithubIssue[]>(url.toString(), accessToken);
      if (items.length === 0) break;

      for (const issue of items) {
        await upsertIssue(userId, issue);
        count += 1;
        if (!latest || issue.updated_at > latest) latest = issue.updated_at;
      }
      if (items.length < 50) break;
      page += 1;
    }

    return { count, since: latest ?? effectiveSince, error: null };
  } catch (error) {
    if (error instanceof GithubAuthError) throw error;
    return { count, since: latest, error: error instanceof Error ? error.message : "Issue/PR sync failed." };
  }
}

// --- Recent commits ------------------------------------------------------
// There's no account-wide "my commits" feed, so this uses the commit search
// API (author:<login>) rather than looping through every repo's commit log.

type GithubCommitSearchItem = {
  sha: string;
  html_url: string;
  commit: { message: string; committer?: { date?: string }; author?: { date?: string } };
  repository?: { full_name?: string };
};

async function upsertCommit(userId: string, item: GithubCommitSearchItem) {
  const message = item.commit.message.split("\n")[0].slice(0, 140) || "Commit";
  const date = item.commit.committer?.date ?? item.commit.author?.date ?? null;
  await upsertSourceEntity({
    userId,
    type: "note",
    title: message,
    summary: `Commit in ${item.repository?.full_name ?? "a repository"}`,
    body: item.commit.message,
    provider: "github",
    providerId: `commit:${item.sha}`,
    sourceUrl: item.html_url,
    sourceUpdatedAt: date,
    metadata: { repository: item.repository?.full_name, sha: item.sha },
  });
  return date;
}

export async function syncCommits(
  userId: string,
  accessToken: string,
  login: string | undefined,
  since: string | undefined,
): Promise<SyncResult & { since?: string }> {
  if (!login) return { count: 0, since, error: "GitHub username unavailable; skipped commit sync." };

  let count = 0;
  let latest = since;
  try {
    const effectiveSince = since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const url = new URL("https://api.github.com/search/commits");
    url.searchParams.set("q", `author:${login} committer-date:>${effectiveSince}`);
    url.searchParams.set("sort", "committer-date");
    url.searchParams.set("order", "desc");
    url.searchParams.set("per_page", "15");

    const result = await githubFetch<{ items: GithubCommitSearchItem[] }>(url.toString(), accessToken);
    for (const item of result.items ?? []) {
      const date = await upsertCommit(userId, item);
      count += 1;
      if (date && (!latest || date > latest)) latest = date;
    }

    return { count, since: latest ?? effectiveSince, error: null };
  } catch (error) {
    if (error instanceof GithubAuthError) throw error;
    return { count, since: latest, error: error instanceof Error ? error.message : "Commit sync failed." };
  }
}
