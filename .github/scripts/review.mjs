/**
 * Claude PR Review via Portkey Gateway
 * ─────────────────────────────────────
 * Called by the claude-review workflow. Reads the PR diff from stdin (passed
 * as the DIFF env var), sends it to Claude through Portkey, then posts the
 * result as a PR review comment via the GitHub REST API.
 *
 * Required env vars (set as GitHub Actions secrets):
 *   PORTKEY_API_KEY      — your Portkey account API key
 *   PORTKEY_VIRTUAL_KEY  — the Portkey virtual-key slug that wraps your
 *                          Anthropic API key (created in the Portkey dashboard)
 *   GH_TOKEN             — GITHUB_TOKEN (provided automatically by Actions)
 *   GITHUB_REPOSITORY    — owner/repo  (provided automatically by Actions)
 *   PR_NUMBER            — pull request number
 *   PR_DIFF              — the raw unified diff text
 *   PR_TITLE             — PR title (optional, for context)
 *   TRIGGER_COMMENT      — body of the @claude comment, if triggered by one
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const https = require('https');

// ─── Config ───────────────────────────────────────────────────────────────────

const PORTKEY_API_KEY     = process.env.PORTKEY_API_KEY;
const PORTKEY_VIRTUAL_KEY = process.env.PORTKEY_VIRTUAL_KEY;
const GH_TOKEN            = process.env.GH_TOKEN;
const REPO                = process.env.GITHUB_REPOSITORY;           // owner/repo
const PR_NUMBER           = process.env.PR_NUMBER;
const DIFF                = (process.env.PR_DIFF || '').slice(0, 12000); // cap size
const PR_TITLE            = process.env.PR_TITLE || '';
const TRIGGER_COMMENT     = process.env.TRIGGER_COMMENT || '';

if (!PORTKEY_API_KEY || !PORTKEY_VIRTUAL_KEY) {
  console.error('Missing PORTKEY_API_KEY or PORTKEY_VIRTUAL_KEY');
  process.exit(1);
}

// ─── Build prompt ─────────────────────────────────────────────────────────────

const baseInstructions = `You are a Senior Full Stack Developer reviewing a Pull Request for
NoteFlow — a note-taking app built with ASP.NET Core 8 (Repository pattern, EF Core + SQLite)
and React 18 / TypeScript / Tailwind CSS.

For every review provide:
1. **Summary** — one paragraph describing what the PR changes.
2. **Architecture & Design** — Repository pattern usage, DTO boundaries, React hook separation.
3. **Correctness** — logic bugs, null-reference risks, missing error handling.
4. **Security** — XSS in export HTML, EF injection vectors, unvalidated input reaching the DB.
5. **Test Coverage** — missing xUnit or Jest/RTL tests for new code paths.
6. **Performance** — unnecessary re-renders, missing EF Includes, N+1 query patterns.
7. **Actionable Suggestions** — concrete code snippet for each issue found.

Use GitHub-flavoured Markdown. Be concise. Use collapsible <details> sections for long code.`;

const userMessage = TRIGGER_COMMENT
  ? `${TRIGGER_COMMENT}\n\nPR title: ${PR_TITLE}\n\nDiff:\n\`\`\`diff\n${DIFF}\n\`\`\``
  : `Please review this PR.\n\nPR title: ${PR_TITLE}\n\nDiff:\n\`\`\`diff\n${DIFF}\n\`\`\``;

// ─── Call Portkey → Claude ────────────────────────────────────────────────────

async function callPortkey() {
  const payload = JSON.stringify({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: baseInstructions,
    messages: [{ role: 'user', content: userMessage }],
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.portkey.ai',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-portkey-api-key': PORTKEY_API_KEY,
          'x-portkey-virtual-key': PORTKEY_VIRTUAL_KEY,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Portkey ${res.statusCode}: ${body}`));
            return;
          }
          try {
            const parsed = JSON.parse(body);
            resolve(parsed.content?.[0]?.text ?? '_(no response)_');
          } catch {
            reject(new Error(`Failed to parse Portkey response: ${body}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── Post GitHub PR comment ───────────────────────────────────────────────────

async function postComment(body) {
  const [owner, repo] = REPO.split('/');
  const payload = JSON.stringify({ body });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/issues/${PR_NUMBER}/comments`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          Authorization: `Bearer ${GH_TOKEN}`,
          'User-Agent': 'NoteFlow-Claude-Review-Bot',
          Accept: 'application/vnd.github+json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve();
          else reject(new Error(`GitHub API ${res.statusCode}: ${data}`));
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  try {
    console.log('Requesting review from Claude via Portkey…');
    const review = await callPortkey();

    const comment = `## Claude Code Review 🤖\n\n${review}\n\n---\n_Powered by [Portkey](https://portkey.ai) → Claude_`;
    await postComment(comment);

    console.log('Review posted successfully.');
  } catch (err) {
    console.error('Review failed:', err.message);
    process.exit(1);
  }
})();
