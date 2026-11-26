import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = JSON.parse(await readFile(new URL('../.vscode/mcp.json', import.meta.url), 'utf8'));
const workspace = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const installed = JSON.parse(await readFile(
    new URL('../node_modules/@pixel-brewery/mosaik-mcp/package.json', import.meta.url), 'utf8'
));

if (installed.version !== workspace.devDependencies['@pixel-brewery/mosaik-mcp']) {
    throw new Error('Installed Mosaik MCP does not match the exact workspace pin.');
}

const { command, args } = source.servers.mosaik;
const child = spawn(command, args, { cwd: root, stdio: ['pipe', 'pipe', 'inherit'] });
const lines = createInterface({ input: child.stdout });
const pending = new Map();
let nextId = 0;

function rejectPending(error) {
    for (const request of pending.values()) request.reject(error);
}

child.on('error', rejectPending);
child.stdin.on('error', rejectPending);
child.on('exit', (code, signal) => rejectPending(new Error(`Mosaik MCP exited (${code ?? signal}).`)));
lines.on('line', (line) => {
    try {
        const message = JSON.parse(line);
        const request = pending.get(message.id);
        if (message.error) request?.reject(new Error(JSON.stringify(message.error)));
        else request?.resolve(message.result);
    } catch (error) {
        rejectPending(error);
    }
});

function send(message) {
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n');
}

async function request(method, params = {}) {
    const id = ++nextId;
    let timer;
    try {
        return await new Promise((resolve, reject) => {
            timer = setTimeout(() => reject(new Error(`Mosaik MCP timed out on ${method}.`)), 15_000);
            pending.set(id, { resolve, reject });
            send({ id, method, params });
        });
    } finally {
        clearTimeout(timer);
        pending.delete(id);
    }
}

try {
    await request('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'pixel-brewery-remote-verification', version: '1' }
    });
    send({ method: 'notifications/initialized' });

    const listed = await request('tools/list');
    const names = new Set(listed.tools.map((tool) => tool.name));
    const expected = [
        'get_studio_authoring_rules',
        'list_studio_templates',
        'list_studio_recipes',
        'get_component_docs',
        'get_component_anatomy',
        'get_framework_guide',
        'get_token_schema'
    ];
    const missing = expected.filter((name) => !names.has(name));
    if (missing.length) throw new Error(`Mosaik MCP is missing tools ${missing.join(', ')}.`);

    const rules = await request('tools/call', { name: 'get_studio_authoring_rules', arguments: {} });
    if (rules.isError || !rules.content?.length) throw new Error('Mosaik authoring rules are unavailable.');

    console.log(`Mosaik MCP ${installed.version} listed ${names.size} tools and returned the authoring rules.`);
} finally {
    child.stdin.end();
    lines.close();
}
