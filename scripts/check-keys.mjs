// Verifies that the three dictionaries stay in step and that every key used by
// the interface exists in all of them.
import fs from 'fs';
import path from 'path';

const FILES = ['en', 'fr', 'ar'];

function readDict(name) {
  const source = fs.readFileSync(`src/i18n/${name}.js`, 'utf8');
  const keys = [];
  const duplicates = [];
  const seen = new Set();
  for (const match of source.matchAll(/^ {2}([A-Za-z_][\w]*)\s*:/gm)) {
    const key = match[1];
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
    keys.push(key);
  }
  return { keys: new Set(keys), count: keys.length, duplicates };
}

const dicts = Object.fromEntries(FILES.map((name) => [name, readDict(name)]));

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (full.endsWith('.jsx') || full.endsWith('.js')) files.push(full);
  }
};
walk('src');

const used = new Set();
for (const file of files) {
  if (file.includes(`${path.sep}i18n${path.sep}`) || file.endsWith(`${path.sep}i18n.jsx`)) continue;
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\bt\.([A-Za-z_][\w]*)/g)) used.add(match[1]);
  for (const match of source.matchAll(/\bt\[['"]([A-Za-z_][\w]*)['"]\]/g)) used.add(match[1]);
}

const problems = [];

for (const name of FILES) {
  const dict = dicts[name];
  if (dict.duplicates.length) {
    problems.push(`${name}: duplicate keys ${[...new Set(dict.duplicates)].join(', ')}`);
  }
  const missing = [...used].filter((key) => !dict.keys.has(key));
  if (missing.length) problems.push(`${name}: missing used keys ${missing.join(', ')}`);
}

const base = dicts.en;
for (const name of FILES.filter((n) => n !== 'en')) {
  const onlyHere = [...dicts[name].keys].filter((key) => !base.keys.has(key));
  const onlyEnglish = [...base.keys].filter((key) => !dicts[name].keys.has(key));
  if (onlyHere.length) problems.push(`${name}: keys not in en (${onlyHere.join(', ')})`);
  if (onlyEnglish.length) problems.push(`en: keys not in ${name} (${onlyEnglish.join(', ')})`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(
  `Translations consistent: ${base.count} keys in each of ${FILES.join(', ')}; `
  + `${used.size} keys used directly by the interface.`,
);
