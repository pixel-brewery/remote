import { createHash } from 'node:crypto';
import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const skillCommit = '9f30dc88564da0e0908a5bd5ae94e1468b1b44d2';
const excludedSkillDirectories = new Set(['.git', '__pycache__', '__pypackages__']);

function requireCondition(condition, message) {
    if (!condition) throw new Error(message);
}

async function readJson(path) {
    return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}

async function collectSkillFiles(rootDirectory, prefix = '') {
    const directory = resolve(rootDirectory, prefix);
    const files = [];

    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.name === 'metadata.json') continue;
        requireCondition(!entry.isSymbolicLink(), `Unexpected skill symlink ${resolve(directory, entry.name)}`);
        const relativePath = prefix + entry.name;

        if (entry.isDirectory() && !excludedSkillDirectories.has(entry.name)) {
            files.push(...await collectSkillFiles(rootDirectory, relativePath + '/'));
        } else if (entry.isFile()) {
            const content = await readFile(resolve(rootDirectory, relativePath));
            files.push({
                path: Buffer.from(relativePath),
                content: content.includes(0)
                    ? content
                    : Buffer.from(content.toString('latin1').replaceAll('\r\n', '\n'), 'latin1')
            });
        }
    }

    return files;
}

async function checkSkills() {
    const lock = await readJson('skills-lock.json');
    requireCondition(lock.version === 2, 'Expected the Skills CLI v2 lock format.');

    for (const name of ['architect', 'designer']) {
        const entry = lock.skills?.[name];
        requireCondition(entry?.source === 'pixel-brewery/skills' && entry.ref === skillCommit &&
            entry.sourceType === 'github' && entry.skillPath === `skills/${name}/SKILL.md` &&
            entry.installMode === 'copy', `Invalid upstream pin for ${name}.`);

        // Skills CLI v2 hashes sorted UTF-8 paths and length-prefixed file contents.
        const files = await collectSkillFiles(resolve(root, '.agents/skills', name));
        files.sort((left, right) => Buffer.compare(left.path, right.path));
        const hash = createHash('sha256');
        for (const file of files) {
            hash.update(file.path).update('\0').update(String(file.content.length)).update('\0').update(file.content);
        }

        requireCondition(hash.digest('hex') === entry.computedHash, `Installed ${name} content differs from its lock.`);
        const derived = await readFile(resolve(root, '.agents/skills', `remote-${name}`, 'SKILL.md'), 'utf8');
        requireCondition(derived.includes(`inherits: ${name}`) && derived.includes(`../${name}/SKILL.md`),
            `Remote ${name} must inherit and load its pinned base.`);
    }
}

async function checkLinks(path) {
    const file = resolve(root, path);
    const source = await readFile(file, 'utf8');
    const prose = source.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
    const targets = [
        ...Array.from(prose.matchAll(/\]\(([^)\s]+)\)/g), (match) => match[1]),
        ...Array.from(prose.matchAll(/\bsrc="([^"]+)"/g), (match) => match[1])
    ];

    for (const target of targets) {
        if (target.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(target)) continue;
        const relativePath = decodeURIComponent(target.split('#')[0]);
        try {
            await access(resolve(dirname(file), relativePath));
        } catch {
            throw new Error(`${path} links to missing path ${target}.`);
        }
    }
}

await checkSkills();
for (const file of ['README.md', 'AGENTS.md', '.docs/README.md', '.docs/plan.md', '.github/assets/README.md']) {
    await checkLinks(file);
}

const artwork = await readJson('.github/assets/project-card.json');
for (const asset of [artwork.image, artwork.icon]) {
    await access(resolve(root, '.github/assets', asset.file));
}

console.log('Verified both immutable skill pins and bootstrap documentation links.');
