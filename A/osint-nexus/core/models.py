"""
Data models for OSINT Nexus
"""
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import json
import uuid


class TargetType(Enum):
    DOMAIN = "domain"
    IP = "ip"
    EMAIL = "email"
    USERNAME = "username"
    PHONE = "phone"
    URL = "url"
    HASH = "hash"
    IMAGE = "image"
    PERSON = "person"
    ORGANIZATION = "organization"


class Severity(Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ModuleStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class Finding:
    """Individual finding from an OSINT module"""
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    module: str = ""
    category: str = ""
    title: str = ""
    description: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
    severity: Severity = Severity.INFO
    confidence: float = 0.0  # 0.0 - 1.0
    source_url: str = ""
    tags: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    raw_data: Any = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "module": self.module,
            "category": self.category,
            "title": self.title,
            "description": self.description,
            "data": self.data,
            "severity": self.severity.value,
            "confidence": self.confidence,
            "source_url": self.source_url,
            "tags": self.tags,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class Target:
    """Investigation target"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    value: str = ""
    target_type: TargetType = TargetType.DOMAIN
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "value": self.value,
            "type": self.target_type.value,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
        }


@dataclass
class ModuleResult:
    """Result from a single module execution"""
    module_name: str = ""
    target: str = ""
    status: ModuleStatus = ModuleStatus.PENDING
    findings: List[Finding] = field(default_factory=list)
    execution_time: float = 0.0
    error_message: str = ""
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    @property
    def finding_count(self) -> int:
        return len(self.findings)

    def add_finding(self, **kwargs) -> Finding:
        finding = Finding(module=self.module_name, **kwargs)
        self.findings.append(finding)
        return finding

    def to_dict(self) -> dict:
        return {
            "module": self.module_name,
            "target": self.target,
            "status": self.status.value,
            "findings": [f.to_dict() for f in self.findings],
            "finding_count": self.finding_count,
            "execution_time": self.execution_time,
            "error_message": self.error_message,
        }


@dataclass
class Investigation:
    """Complete investigation session"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    targets: List[Target] = field(default_factory=list)
    results: Dict[str, ModuleResult] = field(default_factory=dict)
    started_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    notes: str = ""
    tags: List[str] = field(default_factory=list)

    @property
    def total_findings(self) -> int:
        return sum(r.finding_count for r in self.results.values())

    @property
    def all_findings(self) -> List[Finding]:
        findings = []
        for result in self.results.values():
            findings.extend(result.findings)
        return findings

    def add_result(self, module_name: str, result: ModuleResult):
        self.results[module_name] = result

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "targets": [t.to_dict() for t in self.targets],
            "results": {k: v.to_dict() for k, v in self.results.items()},
            "total_findings": self.total_findings,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "notes": self.notes,
            "tags": self.tags,
        }

    def to_json(self, indent=2) -> str:
        return json.dumps(self.to_dict(), indent=indent, default=str)


@dataclass
class Relationship:
    """Relationship between two findings for graph correlation"""
    source_id: str = ""
    target_id: str = ""
    relationship_type: str = ""  # "related_to", "belongs_to", "resolves_to", etc.
    confidence: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)