"""Build and verify local Graphify artifacts; publish only a completed build."""

import argparse
import base64
from collections import Counter
from datetime import datetime, timezone
import hashlib
from html import escape
from importlib.metadata import distributions, version
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import urllib.request

from contracts import enrich


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')


def fingerprint(root):
    command = ['git', '-c', f'safe.directory={root.as_posix()}', 'ls-files', '-z',
               '--cached', '--others', '--exclude-standard']
    result = subprocess.run(command, cwd=root, check=True, capture_output=True)
    digest = hashlib.sha256()
    for name in sorted(set(result.stdout.decode('utf-8').split('\0')) - {''}):
        path = Path(name)
        # Never open private settings, even if accidentally tracked.
        if (path.name.lower() == 'settings.json' or path.name.lower().startswith('.env')
                or path.suffix.lower() in ('.pem', '.key', '.pfx', '.p12', '.zip', '.sql', '.log')
                or any(part in ('.graphify', 'graphify-out', 'artifacts', 'node_modules', '.next', 'bin', 'obj')
                       for part in path.parts)):
            continue
        absolute = root / path
        if absolute.is_file() and not absolute.is_symlink():
            digest.update(name.encode('utf-8'))
            digest.update(absolute.read_bytes())
    return digest.hexdigest()


def run(cli, root, out, *args):
    env = {**os.environ, 'GRAPHIFY_OUT': str(out), 'PYTHONUTF8': '1', 'PYTHONIOENCODING': 'utf-8'}
    subprocess.run([str(cli), *map(str, args)], cwd=root, env=env, check=True)


def validate(graph):
    ids = [n['id'] for n in graph['nodes']]
    if not ids or len(ids) != len(set(ids)):
        raise ValueError('Graph nodes are empty or have duplicate IDs.')
    known = set(ids)
    if any(link['source'] not in known or link['target'] not in known for link in graph['links']):
        raise ValueError('Graph contains dangling edges.')
    if any(Path(n.get('source_file', '')).name.lower() == 'settings.json' for n in graph['nodes']):
        raise ValueError('Private settings appeared in the graph. Build rejected.')


def subgraph(graph, area):
    selected = {n['id'] for n in graph['nodes'] if n['area'] == area}
    if area == 'api':
        bridge = [e for e in graph['links'] if e.get('_origin') == 'moneygestor-http']
        selected.update(e[end] for e in bridge for end in ('source', 'target'))
    return {**graph, 'nodes': [n for n in graph['nodes'] if n['id'] in selected],
            'links': [e for e in graph['links'] if e['source'] in selected and e['target'] in selected]}


def community_labels(graph):
    communities = {}
    for node in graph['nodes']:
        if 'community' not in node:
            continue
        parts = node.get('source_file', '').split('/')
        if node['area'] == 'api':
            name = 'API / HTTP'
        elif parts[:3] == ['frontend', 'src', 'features'] and len(parts) > 3:
            name = f'Frontend / {parts[3]}'
        elif parts[:2] == ['frontend', 'src'] and len(parts) > 2:
            name = f'Frontend / {parts[2]}'
        elif parts[0] == 'backend' and len(parts) > 1:
            name = f'Backend / {parts[1]}'
        else:
            name = 'Tooling / project'
        communities.setdefault(str(node['community']), Counter())[name] += 1
    return {cid: f'{names.most_common(1)[0][0]} [{cid}]' for cid, names in communities.items()}


def make_self_contained(page, state, offline):
    """Inline the pinned visualizer after checking Graphify's upstream SRI hash."""
    content = page.read_text(encoding='utf-8')
    scripts = list(re.finditer(r'<script\s+src="(https://[^"]+)"([^>]*)>\s*</script>', content))
    if not scripts:
        raise ValueError(f'Graphify visualizer format changed: {page.name}')
    for script in scripts:
        url = script[1]
        if not re.fullmatch(r'https://unpkg\.com/vis-network@[\d.]+/standalone/umd/vis-network\.min\.js', url):
            raise ValueError(f'Unexpected external visualizer resource: {url}')
        integrity = re.search(r'integrity="sha384-([^"]+)"', script[2])
        if not integrity:
            raise ValueError('Missing visualizer integrity hash.')
        asset = state / 'assets' / (hashlib.sha256(url.encode()).hexdigest() + '.js')
        if not asset.exists():
            if offline:
                raise ValueError('Visualizer cache is missing. Run without -Offline once.')
            asset.parent.mkdir(exist_ok=True)
            with urllib.request.urlopen(url, timeout=60) as response:
                payload = response.read()
        else:
            payload = asset.read_bytes()
        actual = base64.b64encode(hashlib.sha384(payload).digest()).decode()
        if actual != integrity[1]:
            raise ValueError('Visualizer integrity check failed. Build rejected.')
        if not asset.exists():
            asset.write_bytes(payload)
        # Escape possible closing tags inside JS strings before embedding.
        javascript = payload.decode('utf-8').replace('</script', '<\\/script')
        content = content.replace(script[0], '<script>\n' + javascript + '\n</script>')
    if re.search(r'<(?:script|link)\b[^>]*(?:src|href)="https?://', content):
        raise ValueError('An external dependency remains in the visualizer.')
    page.write_text(content, encoding='utf-8')


def overview(root, out, graph, endpoints, info):
    counts = Counter(n['area'] for n in graph['nodes'])
    rows = []
    markdown = ['# Collegamenti HTTP frontend / backend', '',
                'Generato dagli AST TypeScript e C#. Nessun server o database avviato.', '',
                '| Metodo | Endpoint | Client frontend | Handler backend |', '| --- | --- | --- | --- |']
    for endpoint in endpoints:
        clients = ', '.join(c['name'] for c in endpoint['clients']) or 'Solo backend'
        handler = f"{endpoint['controller']}.{endpoint['action']}"
        source = f"{endpoint['file']}:{endpoint['line']}"
        rows.append('<tr><td><span class="verb">' + escape(endpoint['method']) + '</span></td><td><code>'
                    + escape(endpoint['route']) + '</code></td><td>' + escape(clients)
                    + '</td><td><strong>' + escape(handler) + '</strong><small>' + escape(source) + '</small></td></tr>')
        markdown.append(f"| {endpoint['method']} | `{endpoint['route']}` | {clients} | `{handler}` ({source}) |")
    (out / 'API_MAP.md').write_text('\n'.join(markdown) + '\n', encoding='utf-8')
    template = (root / 'tools/graphify/overview.html').read_text(encoding='utf-8')
    values = {'VERSION': info['graphify_version'], 'TIME': info['built_at_utc'],
              'NODES': len(graph['nodes']), 'EDGES': len(graph['links']),
              'FRONTEND': counts['frontend'], 'BACKEND': counts['backend'], 'API': len(endpoints),
              'TOOLING': counts['tooling'], 'ROWS': '\n'.join(rows)}
    for key, value in values.items():
        template = template.replace('{{' + key + '}}', str(value) if key == 'ROWS' else escape(str(value)))
    (out / 'index.html').write_text(template, encoding='utf-8')


def status(root, out):
    manifest = out / 'build-info.json'
    if not manifest.exists():
        print('No completed build. Run .\\graphify.ps1 first.', file=sys.stderr)
        return 1
    info = json.loads(manifest.read_text(encoding='utf-8'))
    print(f"Graphify: {info['graphify_version']} (installed: {version('graphifyy')})")
    print(f"Built at (UTC): {info['built_at_utc']}")
    print(f"Nodes: {info['nodes']}; edges: {info['edges']}; HTTP endpoints: {info['endpoints']}")
    fresh = fingerprint(root) == info['source_fingerprint']
    print('Sources: CURRENT' if fresh else 'Sources: CHANGED - rebuild required')
    last_run = root / '.graphify/last-run.json'
    if last_run.exists():
        latest = json.loads(last_run.read_text(encoding='utf-8-sig'))
        print(f"Last rebuild: {latest['status']}")
    print(f"Overview: {out / 'index.html'}")
    return 0 if fresh else 2


def build(root, out, offline=False):
    state = root / '.graphify'
    work = state / 'build'
    latest_verified = None
    if not offline:
        with urllib.request.urlopen('https://pypi.org/pypi/graphifyy/json', timeout=30) as response:
            package = json.load(response)['info']
        latest_verified = package['version']
        if version('graphifyy') != latest_verified:
            raise ValueError(f"Latest Graphify is {latest_verified}, installed {version('graphifyy')}. "
                             f"The latest release requires Python {package.get('requires_python')}. "
                             'Update the local Python environment before rebuilding.')
    # Only this fixed, generated directory may be cleared. Never follow a junction.
    if state.resolve() != root / '.graphify' or work.is_symlink() or work.resolve() != state.resolve() / 'build':
        raise ValueError('Unsafe build directory.')
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)
    cli = state / 'venv/Scripts/graphify.exe'
    initial_fingerprint = fingerprint(root)
    print('[2/4] Extracting code locally (no model or API key)...', flush=True)
    run(cli, root, work, 'extract', root, '--code-only', '--force', '--max-workers', '2')
    graph_path = work / 'graph.json'
    graph = json.loads(graph_path.read_text(encoding='utf-8'))
    print('[3/4] Linking HTTP contracts and creating focused graphs...', flush=True)
    endpoints = enrich(root, graph)
    validate(graph)
    write_json(graph_path, graph)
    write_json(work / 'api-contracts.json', endpoints)
    run(cli, root, work, 'cluster-only', root, '--graph', graph_path, '--no-label')
    # Reload the clustered graph so focused views keep community membership.
    graph = json.loads(graph_path.read_text(encoding='utf-8'))
    validate(graph)
    write_json(work / '.graphify_labels.json', community_labels(graph))
    run(cli, root, work, 'cluster-only', root, '--graph', graph_path, '--no-label')
    graph = json.loads(graph_path.read_text(encoding='utf-8'))
    validate(graph)
    for area in ('frontend', 'backend', 'api'):
        folder = work / area
        folder.mkdir()
        focused = subgraph(graph, area)
        if not focused['nodes']:
            raise ValueError(f'Empty focused graph: {area}')
        write_json(folder / 'graph.json', focused)
        shutil.copyfile(work / '.graphify_labels.json', folder / '.graphify_labels.json')
        run(cli, root, folder, 'export', 'html', '--graph', folder / 'graph.json')
    for page in (work / 'graph.html', *(work / area / 'graph.html' for area in ('frontend', 'backend', 'api'))):
        make_self_contained(page, state, offline)
    if initial_fingerprint != fingerprint(root):
        raise ValueError('Source files changed during generation. Run the command again.')
    info = {'built_at_utc': datetime.now(timezone.utc).isoformat(timespec='seconds'),
            'graphify_version': version('graphifyy'), 'source_fingerprint': initial_fingerprint,
            'nodes': len(graph['nodes']), 'edges': len(graph['links']), 'endpoints': len(endpoints),
            'mode': 'local-code-only-with-http-bridge', 'graph_schema_version': graph['graph']['schema_version'],
            'latest_stable_verified': latest_verified}
    overview(root, work, graph, endpoints, info)
    write_json(work / 'build-info.json', info)
    packages = sorted(f"{d.metadata['Name']}=={d.version}" for d in distributions())
    (work / 'installed-packages.txt').write_text('\n'.join(packages) + '\n', encoding='utf-8')
    required = ['graph.json', 'graph.html', 'GRAPH_REPORT.md', 'index.html', 'API_MAP.md',
                'api-contracts.json', 'build-info.json', 'frontend/graph.html', 'backend/graph.html', 'api/graph.html']
    for name in required:
        if not (work / name).is_file() or (work / name).stat().st_size == 0:
            raise ValueError(f'Missing or empty artifact: {name}')
    print('[4/4] Publishing verified artifacts...', flush=True)
    if out.is_symlink() or out.resolve() != state.resolve() / 'output':
        raise ValueError('Unsafe output directory.')
    # Copy completed artifacts only; leave the previous successful build untouched on extraction errors.
    shutil.copytree(work, out, dirs_exist_ok=True)
    print(f"Build complete: Graphify {info['graphify_version']}; {info['nodes']} nodes; {info['edges']} edges; {len(endpoints)} endpoints.")
    print(f"Open: {out / 'index.html'}")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--status', action='store_true')
    parser.add_argument('--offline', action='store_true')
    args = parser.parse_args()
    root = args.root.resolve()
    out = root / '.graphify/output'
    return status(root, out) if args.status else build(root, out, args.offline)


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f'Graphify build failed: {error}', file=sys.stderr)
        sys.exit(1)
