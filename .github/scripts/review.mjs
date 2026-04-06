/**
 * Claude PR Review via Perficient Portkey Gateway (AWS Bedrock)
 * ──────────────────────────────────────────────────────────────
 * Calls the company's self-hosted Portkey gateway using the OpenAI-compatible
 * /v1/chat/completions endpoint, then posts the result as a PR comment.
 *
 * Required GitHub Actions secrets:
 *   PORTKEY_API_KEY    — x-portkey-api-key for the internal gateway
 *
 * Automatic Actions env vars used:
 *   GH_TOKEN           — GITHUB_TOKEN
 *   GITHUB_REPOSITORY  — owner/repo
 *
 * Workflow-provided env vars:
 *   PR_NUMBER          — pull request number
 *   PR_DIFF            — raw unified diff text
 *   PR_TITLE           — PR title
 *   TRIGGER_COMMENT    — body of the @claude comment (empty on auto-review)
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const https = require('https');

// ─── Config ───────────────────────────────────────────────────────────────────

const PORTKEY_API_KEY = process.env.PORTKEY_API_KEY;
const GH_TOKEN        = process.env.GH_TOKEN;
const REPO            = process.env.GITHUB_REPOSITORY;
const PR_NUMBER       = process.env.PR_NUMBER;
const DIFF            = (process.env.PR_DIFF    || '').slice(0, 12000);
const PR_TITLE        = process.env.PR_TITLE    || '';
const TRIGGER_COMMENT = process.env.TRIGGER_COMMENT || '';

// Gateway coordinates — matches the curl example from the team
const GATEWAY_HOST  = 'portkeygateway.perficient.com';
const GATEWAY_PATH  = '/v1/chat/completions';
const MODEL         = '@aws-bedrock-use2/us.anthropic.claude-sonnet-4-6';

if (!PORTKEY_API_KEY) {
  console.error('Missing PORTKEY_API_KEY secret');
  process.exit(1);
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a Senior Full Stack Developer reviewing a Pull Request for
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

const userContent = TRIGGER_COMMENT
  ? `${TRIGGER_COMMENT}\n\nPR title: ${PR_TITLE}\n\nDiff:\n\`\`\`diff\n${DIFF}\n\`\`\``
  : `Please review this PR.\n\nPR title: ${PR_TITLE}\n\nDiff:\n\`\`\`diff\n${DIFF}\n\`\`\``;

// ─── Call gateway ─────────────────────────────────────────────────────────────

async function callGateway() {
  const payload = JSON.stringify({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userContent   },
    ],
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: GATEWAY_HOST,
        path:     GATEWAY_PATH,
        method:   'POST',
        headers: {
          'Content-Type':    'application/json',
          'Content-Length':  Buffer.byteLength(payload),
          'x-portkey-api-key': PORTKEY_API_KEY,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Gateway ${res.statusCode}: ${body}`));
            return;
          }
          try {
            // OpenAI chat/completions response shape
            const parsed = JSON.parse(body);
            resolve(parsed.choices?.[0]?.message?.content ?? '_(no response)_');
          } catch {
            reject(new Error(`Failed to parse gateway response: ${body}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── Post GitHub comment ──────────────────────────────────────────────────────

async function postComment(body) {
  const [owner, repo] = REPO.split('/');
  const payload = JSON.stringify({ body });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path:     `/repos/${owner}/${repo}/issues/${PR_NUMBER}/comments`,
        method:   'POST',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'Authorization':  `Bearer ${GH_TOKEN}`,
          'User-Agent':     'NoteFlow-Claude-Review-Bot',
          'Accept':         'application/vnd.github+json',
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
    console.log(`Requesting review from ${MODEL} via ${GATEWAY_HOST}…`);
    const review = await callGateway();

    const comment = `## Claude Code Review 🤖\n\n${review}\n\n---\n_Powered by Perficient Portkey Gateway → AWS Bedrock → Claude_`;
    await postComment(comment);

    console.log('Review posted successfully.');
  } catch (err) {
    console.error('Review failed:', err.message);
    process.exit(1);
  }
})();
