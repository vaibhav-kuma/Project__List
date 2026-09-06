from django.test import TestCase
from django.contrib.auth.models import User
from .models import Todo

class TodoModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='12345')
        Todo.objects.create(title='Test Todo', user=self.user)

    def test_todo_creation(self):
        todo = Todo.objects.get(title='Test Todo')
        self.assertEqual(todo.user, self.user)
        self.assertFalse(todo.completed)

class TodoViewsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='12345')
        self.client.login(username='testuser', password='12345')

    def test_todo_list_view(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'todo_app/todo_list.html')

    def test_todo_add_view(self):
        response = self.client.post('/add/', {'title': 'New Todo'})
        self.assertEqual(response.status_code, 302)  # Redirect after successful creation
        self.assertEqual(Todo.objects.count(), 1)

