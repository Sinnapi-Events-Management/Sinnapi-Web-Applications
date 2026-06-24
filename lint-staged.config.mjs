import path from 'node:path';

// This monorepo keeps a separate ESLint config in every workspace (apps/* and
// packages/*). Several rules resolve paths relative to the current working
// directory — e.g. eslint-config-next's `no-html-link-for-pages` looks for a
// `pages`/`app` dir under cwd, and eslint-plugin-check-file matches its
// `src/**` globs against cwd-relative paths. If lint-staged ran a single
// `eslint` from the repo root, those rules would either crash or silently stop
// matching. So we group the staged files by workspace and run ESLint from each
// workspace dir, mirroring how `turbo run lint` runs it in CI.

const root = process.cwd();

// Quote a path so spaces/special chars survive shell parsing.
const q = (p) => JSON.stringify(p);

// The workspace dir (apps/x or packages/x) that owns a file, or null for files
// that live at the repo root (which has no ESLint config of its own).
function workspaceOf(absFile) {
  const segments = path.relative(root, absFile).split(path.sep);
  if ((segments[0] === 'apps' || segments[0] === 'packages') && segments.length > 2) {
    return `${segments[0]}/${segments[1]}`;
  }
  return null;
}

function groupByWorkspace(files) {
  const groups = new Map();
  for (const file of files) {
    const ws = workspaceOf(file) ?? '.';
    if (!groups.has(ws)) groups.set(ws, []);
    groups.get(ws).push(file);
  }
  return groups;
}

export default {
  '*.{ts,tsx,js,jsx}': (files) => {
    const commands = [];
    for (const [ws, wsFiles] of groupByWorkspace(files)) {
      const absQuoted = wsFiles.map(q).join(' ');
      if (ws === '.') {
        // No ESLint config at the repo root — just format root-level scripts.
        commands.push(`prettier --write ${absQuoted}`);
        continue;
      }
      // Run ESLint from the owning workspace so cwd-relative rules resolve.
      const relQuoted = wsFiles.map((f) => q(path.relative(path.join(root, ws), f))).join(' ');
      commands.push(`bash -c 'cd ${q(ws)} && eslint --fix ${relQuoted}'`);
      // Prettier is cwd-agnostic, so format from the root with absolute paths.
      commands.push(`prettier --write ${absQuoted}`);
    }
    return commands;
  },
  '*.{json,css,scss,md}': (files) => [`prettier --write ${files.map(q).join(' ')}`],
};
