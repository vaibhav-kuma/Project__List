# Contributing to OSINT Nexus

Thank you for your interest in contributing!

## How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-module`)
3. Commit your changes (`git commit -m 'Add amazing module'`)
4. Push to the branch (`git push origin feature/amazing-module`)
5. Open a Pull Request

## Adding New Modules

Create a new module in the appropriate category folder:

```python
from core.engine import BaseModule
from core.models import Target, TargetType, ModuleResult, Severity

class MyModule(BaseModule):
    name = "my_module"
    description = "My awesome OSINT module"
    category = "domain"
    supported_types = [TargetType.DOMAIN]
    requires_api_key = False
    
    async def run(self, target: Target) -> ModuleResult:
        result = ModuleResult(module_name=self.name, target=target.value)
        
        # Your OSINT logic here
        result.add_finding(
            category="my_category",
            title="Finding title",
            description="Finding description",
            data={"key": "value"},
            severity=Severity.INFO,
            confidence=1.0,
            tags=["tag1", "tag2"]
        )
        
        return result
```

## Code Style

- Follow PEP 8
- Use type hints
- Add docstrings
- Keep functions small and focused

## Testing

Run tests before submitting:
```bash
python -m pytest tests/
```

## Questions?

Open an issue for discussion!
