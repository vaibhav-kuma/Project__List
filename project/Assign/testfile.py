from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from .models import Todo
from .forms import TodoForm, CustomUserCreationForm

class TodoModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='12345')
        self.todo = Todo.objects.create(title='Test Todo', user=self.user)

    def test_todo_str_method(self):
        self.assertEqual(str(self.todo), 'Test Todo')

    def test_todo_ordering(self):
        Todo.objects.create(title='Second Todo', user=self.user)
        todos = Todo.objects.all()
        self.assertEqual(todos[0].title, 'Second Todo')
        self.assertEqual(todos[1].title, 'Test Todo')

class TodoViewsTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser', password='12345')
        self.client.login(username='testuser', password='12345')
        self.todo = Todo.objects.create(title='Test Todo', user=self.user)

    def test_todo_edit_view(self):
        response = self.client.post(reverse('todo_edit', args=[self.todo.id]), {'title': 'Updated Todo'})
        self.assertEqual(response.status_code, 302)
        self.todo.refresh_from_db()
        self.assertEqual(self.todo.title, 'Updated Todo')

    def test_todo_delete_view(self):
        response = self.client.post(reverse('todo_delete', args=[self.todo.id]))
        self.assertEqual(response.status_code, 302)
        self.assertEqual(Todo.objects.count(), 0)

    def test_todo_complete_view(self):
        response = self.client.post(reverse('todo_complete', args=[self.todo.id]))
        self.assertEqual(response.status_code, 302)
        self.todo.refresh_from_db()
        self.assertTrue(self.todo.completed)

class TodoFormTest(TestCase):
    def test_todo_form_valid(self):
        form_data = {'title': 'Test Todo', 'description': 'This is a test'}
        form = TodoForm(data=form_data)
        self.assertTrue(form.is_valid())

    def test_todo_form_invalid(self):
        form_data = {'title': '', 'description': 'This is a test'}
        form = TodoForm(data=form_data)
        self.assertFalse(form.is_valid())

class UserAuthTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser', password='12345')

    def test_user_registration(self):
        response = self.client.post(reverse('register'), {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password1': 'testpassword123',
            'password2': 'testpassword123'
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_user_login(self):
        response = self.client.post(reverse('login'), {'username': 'testuser', 'password': '12345'})
        self.assertEqual(response.status_code, 302)
        self.assertTrue('_auth_user_id' in self.client.session)

    def test_user_logout(self):
        self.client.login(username='testuser', password='12345')
        response = self.client.get(reverse('logout'))
        self.assertEqual(response.status_code, 302)
        self.assertFalse('_auth_user_id' in self.client.session)