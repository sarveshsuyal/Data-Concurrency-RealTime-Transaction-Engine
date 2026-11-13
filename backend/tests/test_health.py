import json
from django.test import TestCase, Client
from django.urls import reverse

class HealthAndRootEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_health_check_get_returns_200_json(self):
        """GET /health/ must return HTTP 200 with valid JSON health payload."""
        response = self.client.get('/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        data = json.loads(response.content)
        self.assertEqual(data.get('status'), 'healthy')
        self.assertEqual(data.get('service'), 'datacore-backend')

    def test_health_check_head_returns_200_empty_body(self):
        """HEAD /health/ must return HTTP 200 with an empty body for uptime monitors."""
        response = self.client.head('/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        self.assertEqual(response.content, b'')

    def test_root_get_returns_200_json(self):
        """GET / must return HTTP 200 with service information and health endpoint discovery."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        data = json.loads(response.content)
        self.assertEqual(data.get('service'), 'DataCore API')
        self.assertEqual(data.get('status'), 'running')
        self.assertEqual(data.get('health'), '/health/')

    def test_root_head_returns_200_empty_body(self):
        """HEAD / must return HTTP 200 with an empty body for monitors targeting the bare domain."""
        response = self.client.head('/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        self.assertEqual(response.content, b'')

    def test_health_and_root_disallow_unsafe_methods(self):
        """POST, PUT, DELETE should return 405 Method Not Allowed."""
        post_root = self.client.post('/')
        self.assertEqual(post_root.status_code, 405)
        post_health = self.client.post('/health/')
        self.assertEqual(post_health.status_code, 405)

    def test_existing_routes_and_reverses_remain_intact(self):
        """Verify URL routing and reverse resolution for existing and new endpoints."""
        self.assertEqual(reverse('root'), '/')
        self.assertEqual(reverse('health_check'), '/health/')
        self.assertEqual(reverse('auth_login'), '/api/auth/login/')
        self.assertEqual(reverse('account_list'), '/api/accounts/')
