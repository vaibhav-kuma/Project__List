import unittest
from core.models import Target, TargetType, Finding, Severity, Investigation


class TestModels(unittest.TestCase):
    
    def test_target_creation(self):
        target = Target(value="example.com", target_type=TargetType.DOMAIN)
        self.assertEqual(target.value, "example.com")
        self.assertEqual(target.target_type, TargetType.DOMAIN)
    
    def test_finding_creation(self):
        finding = Finding(
            module="test",
            title="Test Finding",
            severity=Severity.HIGH
        )
        self.assertEqual(finding.module, "test")
        self.assertEqual(finding.severity, Severity.HIGH)
    
    def test_investigation_findings_count(self):
        inv = Investigation(name="Test Investigation")
        self.assertEqual(inv.total_findings, 0)


if __name__ == '__main__':
    unittest.main()
