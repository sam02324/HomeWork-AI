import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const git = spawnSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.md'],
  { cwd: root, encoding: 'utf8', windowsHide: true }
);

if (git.status !== 0) {
  console.error('Unable to list Markdown files with Git.');
  process.exit(1);
}

const markdownFiles = git.stdout.split(/\r?\n/).filter(Boolean);
const brokenLinks = [];
const markdownLink = /!?\[[^\]]*\]\(([^)]+)\)/g;

for (const file of markdownFiles) {
  const absoluteFile = resolve(root, file);
  const content = readFileSync(absoluteFile, 'utf8');

  for (const match of content.matchAll(markdownLink)) {
    let target = match[1].trim();
    if (target.startsWith('<') && target.endsWith('>')) {
      target = target.slice(1, -1);
    } else {
      target = target.split(/\s+["']/)[0];
    }

    if (!target || target.startsWith('#') || target.startsWith('//')) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;

    const pathOnly = target.split('#')[0].split('?')[0];
    if (!pathOnly) continue;

    let decodedPath;
    try {
      decodedPath = decodeURIComponent(pathOnly);
    } catch {
      brokenLinks.push(`${file}: invalid URL encoding in ${target}`);
      continue;
    }

    const absoluteTarget = decodedPath.startsWith('/')
      ? resolve(root, `.${decodedPath}`)
      : resolve(dirname(absoluteFile), decodedPath);

    if (!existsSync(absoluteTarget)) {
      brokenLinks.push(`${file}: ${target}`);
    }
  }
}

if (brokenLinks.length > 0) {
  console.error('Broken local Markdown links:');
  for (const link of brokenLinks) console.error(`- ${link}`);
  process.exit(1);
}

console.log(`Documentation links valid across ${markdownFiles.length} Markdown files.`);
