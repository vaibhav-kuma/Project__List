import unittest
from core.models import TargetType
from utils.validators import InputValidator


class TestInputValidator(unittest.TestCase):
    
    def test_detect_ip(self):
        self.assertEqual(InputValidator.detect_type("192.168.1.1"), TargetType.IP)
    
    def test_detect_email(self):
        self.assertEqual(InputValidator.detect_type("test@example.com"), TargetType.EMAIL)
    
    def test_detect_domain(self):
        self.assertEqual(InputValidator.detect_type("example.com"), TargetType.DOMAIN)
    
    def test_detect_url(self):
        self.assertEqual(InputValidator.detect_type("https://example.com"), TargetType.URL)
    
    def test_validate_ip(self):
        self.assertTrue(InputValidator.validate_target("192.168.1.1", TargetType.IP))
        self.assertFalse(InputValidator.validate_target("999.999.999.999", TargetType.IP))
    
    def test_validate_email(self):
        self.assertTrue(InputValidator.validate_target("test@example.com", TargetType.EMAIL))
        self.assertFalse(InputValidator.validate_target("invalid-email", TargetType.EMAIL))


if __name__ == '__main__':
    unittest.main()
