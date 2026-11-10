"""Source-derived HTTP bridge. No application execution, database or model calls."""

import re
from pathlib import Path

from tree_sitter import Language, Parser
import tree_sitter_c_sharp
import tree_sitter_typescript


CLIENT = 'frontend/src/lib/api/client.ts'


def walk(node):
    yield node
    for child in node.named_children:
        yield from walk(child)


def text(node):
    return node.text.decode('utf-8') if node is not None else ''


def route_key(method, route):
    route = re.sub(r'\$\{[^}]+\}|\{[^}]+\}', '{}', route)
    return method.upper(), '/' + route.strip('/')


def attributes(node):
    return ' '.join(text(child) for child in node.named_children if child.type == 'attribute_list')


def backend_endpoints(root):
    parser = Parser(Language(tree_sitter_c_sharp.language()))
    endpoints = {}
    for path in sorted((root / 'backend/webserver/Controllers/V1').glob('*.cs')):
        tree = parser.parse(path.read_bytes())
        # The upstream C# grammar does not cover every modern method-body
        # construct (e.g. [field] dictionary initializers). Only route and
        # method declarations are used here; reject errors outside bodies.
        for error in walk(tree.root_node):
            if error.type != 'ERROR' and not error.is_missing:
                continue
            parent = error.parent
            in_method_body = False
            while parent is not None:
                if parent.type == 'method_declaration':
                    body = parent.child_by_field_name('body')
                    in_method_body = body is not None and body.start_byte <= error.start_byte < body.end_byte
                    break
                parent = parent.parent
            if not in_method_body:
                raise ValueError(f'C# route/signature parse error in {path.relative_to(root)}:{error.start_point.row + 1}')
        for cls in walk(tree.root_node):
            if cls.type != 'class_declaration':
                continue
            name = text(cls.child_by_field_name('name'))
            if not name.endswith('Controller'):
                continue
            route = re.search(r'\bRoute\("([^"]+)"\)', attributes(cls))
            if not route:
                raise ValueError(f'Unsupported controller route: {name}')
            prefix = route[1].replace('[controller]', name.removesuffix('Controller'))
            for method in cls.child_by_field_name('body').named_children:
                if method.type != 'method_declaration':
                    continue
                http_attributes = re.findall(r'\bHttp(Get|Post|Put|Patch|Delete)(?:\("([^"]*)"\))?', attributes(method))
                for verb, suffix in http_attributes:
                    full_route = suffix[2:] if suffix.startswith('~/') else '/'.join(filter(None, (prefix, suffix)))
                    key = route_key(verb, full_route)
                    if key in endpoints:
                        raise ValueError(f'Ambiguous endpoint: {key}')
                    endpoints[key] = {
                        'method': verb.upper(), 'route': '/' + full_route.strip('/'),
                        'controller': name, 'action': text(method.child_by_field_name('name')),
                        'file': path.relative_to(root).as_posix(), 'line': method.start_point.row + 1,
                        'clients': [],
                    }
    if not endpoints:
        raise ValueError('No backend HTTP endpoints found.')
    return endpoints


def literal(node):
    if node is None or node.type not in ('string', 'template_string'):
        return None
    return text(node)[1:-1]


def callee(call):
    node = call.child_by_field_name('function')
    while node is not None and node.type == 'await_expression':
        node = node.named_children[0]
    return text(node)


def http_calls(node):
    """Read send({method,url}) and direct http.get(url) shapes from the TS AST."""
    for child in walk(node):
        if child.type == 'object':
            props = {text(p.child_by_field_name('key')): p.child_by_field_name('value')
                     for p in child.named_children if p.type == 'pair'}
            if 'method' in props and 'url' in props:
                method, url = literal(props['method']), literal(props['url'])
                if not method or not url:
                    raise ValueError('Unsupported dynamic HTTP method or URL in the API client.')
                yield method, url, child.start_point.row + 1
        if child.type == 'call_expression':
            function = callee(child)
            match = re.fullmatch(r'http\.(get|post|put|patch|delete)', function)
            args = child.child_by_field_name('arguments')
            if match and args and args.named_children:
                url = literal(args.named_children[0])
                if url:
                    yield match[1].upper(), url, child.start_point.row + 1


def client_endpoints(root):
    parser = Parser(Language(tree_sitter_typescript.language_typescript()))
    tree = parser.parse((root / CLIENT).read_bytes())
    if tree.root_node.has_error:
        raise ValueError('TypeScript parse errors in the API client.')
    functions = {text(n.child_by_field_name('name')): n for n in walk(tree.root_node)
                 if n.type == 'function_declaration'}
    declaration = next(n for n in walk(tree.root_node) if n.type == 'variable_declarator'
                       and text(n.child_by_field_name('name')) == 'apiClient')
    for prop in declaration.child_by_field_name('value').named_children:
        if prop.type == 'pair':
            name, body = text(prop.child_by_field_name('key')), prop.child_by_field_name('value')
        elif prop.type == 'shorthand_property_identifier':
            name = text(prop)
            body = functions[name]
        else:
            raise ValueError(f'Unsupported apiClient member: {text(prop)}')
        calls = list(http_calls(body))
        if len(calls) != 1:
            raise ValueError(f'Expected one HTTP request for apiClient.{name}, found {len(calls)}.')
        verb, route, line = calls[0]
        yield {'name': f'apiClient.{name}', 'member': name, 'method': verb.upper(),
               'route': route, 'file': CLIENT, 'line': line}
    for verb, route, line in http_calls(functions['requestCsrf']):
        yield {'name': 'requestCsrf()', 'member': None, 'method': verb,
               'route': route, 'file': CLIENT, 'line': line}


def enrich(root, graph):
    """Add API nodes and evidence-backed edges, preserving Graphify's schema."""
    if graph.get('graph', {}).get('schema_version') != 1 or 'links' not in graph:
        raise ValueError('Unsupported Graphify graph schema. Review the integration before rebuilding.')
    endpoints = backend_endpoints(root)
    clients = list(client_endpoints(root))
    nodes = graph['nodes']
    links = graph['links']
    by_file = {}
    for node in nodes:
        by_file.setdefault(node.get('source_file', '').replace('\\', '/'), []).append(node)

    def find(file, label):
        matches = [n for n in by_file.get(file, []) if n['label'] == label]
        if len(matches) != 1:
            raise ValueError(f'Expected one graph symbol {label} in {file}, found {len(matches)}.')
        return matches[0]['id']

    def add_node(id, label, file, line, area):
        nodes.append({'id': id, 'label': label, 'source_file': file, 'source_location': f'L{line}',
                      'file_type': 'code', '_origin': 'moneygestor-http', 'area': area})
        return id

    def edge(source, target, relation, file, line):
        links.append({'source': source, 'target': target, 'relation': relation,
                      'confidence': 'EXTRACTED', 'confidence_score': 1.0, 'weight': 1.0,
                      'source_file': file, 'source_location': f'L{line}', '_origin': 'moneygestor-http'})

    for key, endpoint in endpoints.items():
        id = f'moneygestor:http:{key[0]}:{key[1]}'
        endpoint['id'] = id
        add_node(id, f"{endpoint['method']} {endpoint['route']}", endpoint['file'], endpoint['line'], 'api')
        handler = find(endpoint['file'], f"{endpoint['controller']}.{endpoint['action']}()")
        edge(id, handler, 'handled_by', endpoint['file'], endpoint['line'])

    members = {}
    for client in clients:
        key = route_key(client['method'], client['route'])
        if key not in endpoints:
            raise ValueError(f"Frontend request has no backend handler: {client['name']} -> {key}")
        endpoint = endpoints[key]
        if client['member']:
            id = add_node(f"moneygestor:client:{client['member']}", client['name'], CLIENT, client['line'], 'frontend')
            members[client['member']] = id
            edge(find(CLIENT, 'apiClient'), id, 'contains', CLIENT, client['line'])
        else:
            id = find(CLIENT, client['name'])
        edge(id, endpoint['id'], 'requests', CLIENT, client['line'])
        endpoint['clients'].append(client)

    # Only inspect files already indexed by Graphify, respecting its exclusions.
    for file, symbols in by_file.items():
        if not file.startswith('frontend/src/') or Path(file).suffix not in ('.ts', '.tsx'):
            continue
        language = tree_sitter_typescript.language_tsx if file.endswith('.tsx') else tree_sitter_typescript.language_typescript
        parser = Parser(Language(language()))
        tree = parser.parse((root / file).read_bytes())
        consumer = None
        for call in walk(tree.root_node):
            if call.type != 'call_expression':
                continue
            match = re.fullmatch(r'apiClient\.(\w+)', callee(call))
            if not match:
                continue
            if match[1] not in members:
                raise ValueError(f'Unknown API client member {match[1]} in {file}')
            # File-level provenance avoids guessing which nested callback owns a call.
            if consumer is None:
                consumer = add_node(f'moneygestor:consumer:{file}', f'HTTP consumer: {file}', file, 1, 'frontend')
                for symbol in symbols:
                    edge(consumer, symbol['id'], 'contains_symbol', file, 1)
            edge(consumer, members[match[1]], 'calls_api_client', file, call.start_point.row + 1)

    for node in nodes:
        file = node.get('source_file', '').replace('\\', '/')
        node.setdefault('area', 'frontend' if file.startswith('frontend/') else
                        'backend' if file.startswith('backend/') else 'tooling')
    return sorted(endpoints.values(), key=lambda e: (e['route'], e['method']))
