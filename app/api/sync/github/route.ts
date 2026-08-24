import { NextResponse } from "next/server";
import {
  completeSyncJob,
  createSyncJob,
  finishAccountSync,
  getGithubAccountForSync,
  requireCurrentUser,
  updateConnectionProfile,
  updateSyncCursor,
} from "../../../lib/server/data";
import { decryptSecret } from "../../../lib/server/oauth";
import {
  GithubAuthError,
  fetchGithubProfile,
  parseGithubCursor,
  serializeGithubCursor,
  syncCommits,
  syncIssuesAndPRs,
  syncRepositories,
} from "../../../lib/server/github-sync";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await requireCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const account = await getGithubAccountForSync(user.userId);
  if (!account?.encrypted_access_token) {
    return NextResponse.json({ error: "GitHub is not connected." }, { status: 400 });
  }

  const cursor = parseGithubCursor(account.sync_cursor);
  const hasCursor = Boolean(cursor.issuesSince || cursor.commitsSince);
  const jobId = await createSyncJob(user.userId, "github", hasCursor ? "incremental" : "initial");
  const accessToken = await decryptSecret(account.encrypted_access_token);

  const failJob = async (message: string, status: number) => {
    await finishAccountSync(user.userId, "github", { status: "error", errorMessage: message });
    await completeSyncJob(jobId, { status: "error", total: 0, processed: 0, errorMessage: message });
    return NextResponse.json({ error: message }, { status });
  };

  // GitHub OAuth App tokens don't expire and there's no refresh grant, so a
  // rejected token here always means "the user needs to reconnect" rather
  // than something the sync route can recover from on its own.
  let login: string | undefined;
  try {
    const profile = await fetchGithubProfile(accessToken);
    login = profile.login;
    await updateConnectionProfile(user.userId, "github", { displayName: profile.login, email: profile.email ?? null });
  } catch (error) {
    if (error instanceof GithubAuthError) {
      return failJob("GitHub access token was rejected. Reconnect GitHub.", 401);
    }
    return failJob(error instanceof Error ? error.message : "Could not read the GitHub profile.", 500);
  }

  let repos: Awaited<ReturnType<typeof syncRepositories>>;
  let issues: Awaited<ReturnType<typeof syncIssuesAndPRs>>;
  let commits: Awaited<ReturnType<typeof syncCommits>>;
  try {
    [repos, issues, commits] = await Promise.all([
      syncRepositories(user.userId, accessToken),
      syncIssuesAndPRs(user.userId, accessToken, cursor.issuesSince),
      syncCommits(user.userId, accessToken, login, cursor.commitsSince),
    ]);
  } catch (error) {
    if (error instanceof GithubAuthError) {
      return failJob("GitHub access token was rejected. Reconnect GitHub.", 401);
    }
    return failJob(error instanceof Error ? error.message : "GitHub sync failed.", 500);
  }

  await updateSyncCursor(
    user.userId,
    "github",
    serializeGithubCursor({
      issuesSince: issues.since ?? cursor.issuesSince,
      commitsSince: commits.since ?? cursor.commitsSince,
    }),
  );

  const counts = { repositories: repos.count, issuesAndPRs: issues.count, commits: commits.count };
  const total = counts.repositories + counts.issuesAndPRs + counts.commits;
  const partialErrors = [repos.error, issues.error, commits.error].filter((value): value is string => Boolean(value));

  await finishAccountSync(user.userId, "github", {
    status: partialErrors.length > 0 ? "needs_attention" : "connected",
    errorMessage: partialErrors.length > 0 ? partialErrors.join(" | ") : null,
  });
  await completeSyncJob(jobId, {
    status: "complete",
    total,
    processed: total,
    errorMessage: partialErrors.length > 0 ? partialErrors.join(" | ") : null,
  });

  return NextResponse.json({
    ok: true,
    counts,
    partialErrors: partialErrors.length > 0 ? partialErrors : undefined,
  });
}
