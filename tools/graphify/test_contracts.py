"""Focused tooling tests. These never launch or modify MoneyGestor."""

from pathlib import Path
import tempfile
import unittest

from contracts import CLIENT, backend_endpoints, client_endpoints, enrich, route_key
from build import validate


CONTROLLERS = '''
[Route("api/v1/transactions")]
public class TransactionsController : ControllerBase {
    [HttpPost]
    public IActionResult Create() { return Ok(); }
    [HttpGet("{transactionId:long}")]
    public IActionResult Get(long transactionId) { return Ok(); }
}
[Route("api/v1/auth")]
public class AuthController : ControllerBase {
    [HttpGet("antiforgery")]
    public IActionResult Token() { return Ok(); }
}
'''
CLIENT_CODE = '''
async function requestCsrf() {
    return await http.get<{ token: string }>('/api/v1/auth/antiforgery');
}
export const apiClient = {
    createTransaction: (body: TransactionCreate) => send<number>({ method: 'POST', url: '/api/v1/transactions', data: body }),
    transaction: (id: number) => send<Transaction>({ method: 'GET', url: `/api/v1/transactions/${id}` }),
};
'''


class ContractTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.controller = self.root / 'backend/webserver/Controllers/V1/ResourceControllers.cs'
        self.controller.parent.mkdir(parents=True)
        self.controller.write_text(CONTROLLERS, encoding='utf-8')
        self.client = self.root / CLIENT
        self.client.parent.mkdir(parents=True)
        self.client.write_text(CLIENT_CODE, encoding='utf-8')

    def graph(self):
        file = self.controller.relative_to(self.root).as_posix()
        return {'graph': {'schema_version': 1}, 'nodes': [
            {'id': name, 'label': name, 'source_file': source}
            for source, name in [(file, 'TransactionsController.Create()'),
                                 (file, 'TransactionsController.Get()'), (file, 'AuthController.Token()'),
                                 (CLIENT, 'apiClient'), (CLIENT, 'requestCsrf()')]], 'links': []}

    def test_route_parameters_and_constraints_match(self):
        self.assertEqual(route_key('get', '/api/v1/transactions/${id}'),
                         route_key('GET', '/api/v1/transactions/{transactionId:long}'))

    def test_multiple_controllers_and_methods_in_one_file(self):
        endpoints = backend_endpoints(self.root)
        self.assertEqual(len(endpoints), 3)
        self.assertEqual(endpoints[('POST', '/api/v1/transactions')]['action'], 'Create')

    def test_duplicate_routes_fail(self):
        self.controller.write_text(CONTROLLERS + CONTROLLERS, encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'Ambiguous endpoint'):
            backend_endpoints(self.root)

    def test_awaited_generic_request_and_template_url(self):
        clients = list(client_endpoints(self.root))
        self.assertEqual(len(clients), 3)
        self.assertEqual(clients[-1]['route'], '/api/v1/auth/antiforgery')
        self.assertEqual(clients[1]['route'], '/api/v1/transactions/${id}')

    def test_dynamic_url_fails_instead_of_omitting_request(self):
        self.client.write_text(CLIENT_CODE.replace("url: '/api/v1/transactions'", 'url: dynamicRoute'), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'Unsupported dynamic HTTP'):
            list(client_endpoints(self.root))

    def test_bridge_joins_client_to_handler(self):
        graph = self.graph()
        endpoints = enrich(self.root, graph)
        validate(graph)
        post = next(e for e in endpoints if e['method'] == 'POST')
        self.assertTrue(any(e['source'] == 'moneygestor:client:createTransaction'
                            and e['target'] == post['id'] and e['relation'] == 'requests' for e in graph['links']))
        self.assertTrue(any(e['source'] == post['id'] and e['target'] == 'TransactionsController.Create()'
                            for e in graph['links']))

    def test_unknown_frontend_endpoint_fails(self):
        self.client.write_text(CLIENT_CODE.replace("url: '/api/v1/transactions'", "url: '/api/v1/missing'"), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'no backend handler'):
            enrich(self.root, self.graph())

    def test_incompatible_graph_schema_fails(self):
        graph = self.graph()
        graph['graph']['schema_version'] = 999
        with self.assertRaisesRegex(ValueError, 'Unsupported Graphify graph schema'):
            enrich(self.root, graph)

    def test_dangling_edges_fail_validation(self):
        graph = self.graph()
        graph['links'].append({'source': 'apiClient', 'target': 'missing'})
        with self.assertRaisesRegex(ValueError, 'dangling'):
            validate(graph)


if __name__ == '__main__':
    unittest.main()
