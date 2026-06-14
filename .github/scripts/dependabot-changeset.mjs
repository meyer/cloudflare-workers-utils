// Generates a changeset for a Dependabot PR.
//
// Uses changesets' own git helper — the same one that powers `changeset add`'s
// "changed packages" detection — to find which workspace packages changed since
// the PR base, then writes a patch changeset for the published ones (the private
// root package is excluded automatically).
//
// Env:
//   BASE_REF   - ref to diff against, e.g. origin/main (github.base_ref)
//   PR_NUMBER  - PR number, for a stable changeset filename
import { writeFileSync } from 'node:fs';

import { getChangedPackagesSinceRef } from '@changesets/git';

for (const name of ['BASE_REF', 'PR_NUMBER']) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const ref = process.env.BASE_REF;
const prNumber = process.env.PR_NUMBER;

const changed = await getChangedPackagesSinceRef({ cwd: process.cwd(), ref });
const published = changed
  .map((pkg) => pkg.packageJson)
  .filter((pkg) => !pkg.private && pkg.name)
  .map((pkg) => pkg.name);

if (published.length === 0) {
  console.log('No published packages changed; no changeset needed.');
  process.exit(0);
}

const frontmatter = published.map((name) => `"${name}": patch`).join('\n');
writeFileSync(`.changeset/dependabot-${prNumber}.md`, `---\n${frontmatter}\n---\n\nUpdate dependencies\n`);
console.log(`Wrote changeset for: ${published.join(', ')}`);
