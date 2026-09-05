"""
Database Manager for persistent storage
"""
import json
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine, Column, String, Text, Float, DateTime, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from utils.logger import setup_logger

logger = setup_logger(__name__)
Base = declarative_base()


class InvestigationRecord(Base):
    __tablename__ = "investigations"
    
    id = Column(String(36), primary_key=True)
    name = Column(String(255))
    targets = Column(Text)  # JSON
    results = Column(Text)  # JSON
    total_findings = Column(Integer, default=0)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    notes = Column(Text)
    tags = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class FindingRecord(Base):
    __tablename__ = "findings"
    
    id = Column(String(8), primary_key=True)
    investigation_id = Column(String(36))
    module = Column(String(100))
    category = Column(String(100))
    title = Column(String(500))
    description = Column(Text)
    data = Column(Text)  # JSON
    severity = Column(String(20))
    confidence = Column(Float)
    source_url = Column(Text)
    tags = Column(Text)
    timestamp = Column(DateTime)


class APIKeyRecord(Base):
    __tablename__ = "api_keys"
    
    name = Column(String(100), primary_key=True)
    value = Column(String(500))
    last_used = Column(DateTime)
    usage_count = Column(Integer, default=0)


class DatabaseManager:
    """Manages database operations"""
    
    def __init__(self, db_url: str = "sqlite:///database/osint_nexus.db"):
        Path("database").mkdir(exist_ok=True)
        self.engine = create_engine(db_url, echo=False)
        self.Session = sessionmaker(bind=self.engine)
    
    def init_db(self):
        """Initialize database tables"""
        Base.metadata.create_all(self.engine)
        logger.info("Database initialized")
    
    def save_investigation(self, investigation):
        """Save investigation to database"""
        self.init_db()
        session = self.Session()
        try:
            record = InvestigationRecord(
                id=investigation.id,
                name=investigation.name,
                targets=json.dumps([t.to_dict() for t in investigation.targets], default=str),
                results=json.dumps(
                    {k: v.to_dict() for k, v in investigation.results.items()}, default=str
                ),
                total_findings=investigation.total_findings,
                started_at=investigation.started_at,
                completed_at=investigation.completed_at,
                notes=investigation.notes,
                tags=json.dumps(investigation.tags),
            )
            session.merge(record)
            
            # Save individual findings
            for result in investigation.results.values():
                for finding in result.findings:
                    f_record = FindingRecord(
                        id=finding.id,
                        investigation_id=investigation.id,
                        module=finding.module,
                        category=finding.category,
                        title=finding.title,
                        description=finding.description,
                        data=json.dumps(finding.data, default=str),
                        severity=finding.severity.value,
                        confidence=finding.confidence,
                        source_url=finding.source_url,
                        tags=json.dumps(finding.tags),
                        timestamp=finding.timestamp,
                    )
                    session.merge(f_record)
            
            session.commit()
            logger.info(f"Investigation {investigation.id} saved to database")
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save investigation: {e}")
        finally:
            session.close()
    
    def get_investigation(self, inv_id: str) -> dict:
        """Retrieve investigation by ID"""
        self.init_db()
        session = self.Session()
        try:
            record = session.query(InvestigationRecord).filter_by(id=inv_id).first()
            if record:
                return {
                    "id": record.id,
                    "name": record.name,
                    "targets": json.loads(record.targets),
                    "results": json.loads(record.results),
                    "total_findings": record.total_findings,
                    "started_at": str(record.started_at),
                    "completed_at": str(record.completed_at),
                }
            return {}
        finally:
            session.close()
    
    def list_investigations(self) -> list:
        """List all investigations"""
        self.init_db()
        session = self.Session()
        try:
            records = session.query(InvestigationRecord).order_by(
                InvestigationRecord.created_at.desc()
            ).all()
            return [{
                "id": r.id,
                "name": r.name,
                "total_findings": r.total_findings,
                "started_at": str(r.started_at),
                "completed_at": str(r.completed_at),
            } for r in records]
        finally:
            session.close()
    
    def search_findings(self, query: str) -> list:
        """Search findings by keyword"""
        self.init_db()
        session = self.Session()
        try:
            records = session.query(FindingRecord).filter(
                FindingRecord.data.contains(query) |
                FindingRecord.title.contains(query) |
                FindingRecord.description.contains(query)
            ).all()
            return [{
                "id": r.id,
                "module": r.module,
                "title": r.title,
                "severity": r.severity,
                "data": json.loads(r.data),
            } for r in records]
        finally:
            session.close()