"""
Data Correlation Engine
Finds relationships between findings across modules
"""
import re
from typing import List, Dict, Set, Tuple
from collections import defaultdict

from core.models import Investigation, Finding, Relationship
from utils.logger import setup_logger

logger = setup_logger(__name__)


class DataCorrelator:
    """
    Correlates findings across different OSINT modules
    to find hidden connections and patterns
    """
    
    def __init__(self):
        self.relationships: List[Relationship] = []
        self.entity_index: Dict[str, List[Finding]] = defaultdict(list)
        
        # Regex patterns for entity extraction
        self.patterns = {
            "ip": re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b'),
            "email": re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            "domain": re.compile(r'\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b'),
            "phone": re.compile(r'[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{7,15}'),
            "hash_md5": re.compile(r'\b[a-fA-F0-9]{32}\b'),
            "hash_sha1": re.compile(r'\b[a-fA-F0-9]{40}\b'),
            "hash_sha256": re.compile(r'\b[a-fA-F0-9]{64}\b'),
            "url": re.compile(r'https?://[^\s<>"{}|\\^`\[\]]+'),
            "asn": re.compile(r'\bAS\d+\b'),
            "cve": re.compile(r'CVE-\d{4}-\d{4,}'),
        }
    
    def correlate(self, investigation: Investigation) -> List[Relationship]:
        """
        Main correlation method - analyzes all findings
        """
        self.relationships = []
        self.entity_index = defaultdict(list)
        
        all_findings = investigation.all_findings
        
        if not all_findings:
            return []
        
        # Step 1: Extract entities from all findings
        for finding in all_findings:
            entities = self._extract_entities(finding)
            for entity_type, values in entities.items():
                for value in values:
                    key = f"{entity_type}:{value.lower()}"
                    self.entity_index[key].append(finding)
        
        # Step 2: Find cross-module correlations
        for key, findings in self.entity_index.items():
            if len(findings) > 1:
                # Multiple findings reference the same entity
                modules = set(f.module for f in findings)
                if len(modules) > 1:
                    # Cross-module correlation found!
                    for i in range(len(findings)):
                        for j in range(i + 1, len(findings)):
                            rel = Relationship(
                                source_id=findings[i].id,
                                target_id=findings[j].id,
                                relationship_type="shared_entity",
                                confidence=0.8,
                                metadata={
                                    "entity_type": key.split(":")[0],
                                    "entity_value": key.split(":", 1)[1],
                                    "source_module": findings[i].module,
                                    "target_module": findings[j].module,
                                }
                            )
                            self.relationships.append(rel)
        
        # Step 3: Domain-IP correlations
        self._correlate_domain_ip(all_findings)
        
        # Step 4: Email-Domain correlations
        self._correlate_email_domain(all_findings)
        
        # Step 5: Threat correlations
        self._correlate_threats(all_findings)
        
        logger.info(f"Found {len(self.relationships)} correlations")
        return self.relationships
    
    def _extract_entities(self, finding: Finding) -> Dict[str, Set[str]]:
        """Extract all entities from a finding"""
        entities = defaultdict(set)
        
        # Search in data dict
        text = str(finding.data) + " " + finding.description + " " + str(finding.raw_data or "")
        
        for entity_type, pattern in self.patterns.items():
            matches = pattern.findall(text)
            for match in matches:
                entities[entity_type].add(match)
        
        return entities
    
    def _correlate_domain_ip(self, findings: List[Finding]):
        """Find domain-IP relationships"""
        domains = {}
        ips = {}
        
        for f in findings:
            if f.category == "dns" and "ip" in f.data:
                domain = f.data.get("domain", f.data.get("hostname", ""))
                ip = f.data.get("ip", "")
                if domain and ip:
                    self.relationships.append(Relationship(
                        source_id=f.id,
                        target_id=f.id,
                        relationship_type="resolves_to",
                        confidence=1.0,
                        metadata={"domain": domain, "ip": ip}
                    ))
    
    def _correlate_email_domain(self, findings: List[Finding]):
        """Find email-domain relationships"""
        for f in findings:
            emails = self.patterns["email"].findall(str(f.data))
            for email in emails:
                domain = email.split("@")[1]
                self.relationships.append(Relationship(
                    source_id=f.id,
                    target_id=f.id,
                    relationship_type="email_on_domain",
                    confidence=1.0,
                    metadata={"email": email, "domain": domain}
                ))
    
    def _correlate_threats(self, findings: List[Finding]):
        """Correlate threat intelligence findings"""
        threat_findings = [f for f in findings if f.category == "threat_intel"]
        
        for f in threat_findings:
            if f.severity in (Severity.HIGH, Severity.CRITICAL):
                self.relationships.append(Relationship(
                    source_id=f.id,
                    target_id=f.id,
                    relationship_type="high_risk",
                    confidence=f.confidence,
                    metadata={"severity": f.severity.value}
                ))
    
    def build_graph(self) -> Dict:
        """Build a network graph from relationships"""
        nodes = set()
        edges = []
        
        for rel in self.relationships:
            nodes.add(rel.source_id)
            nodes.add(rel.target_id)
            edges.append({
                "from": rel.source_id,
                "to": rel.target_id,
                "type": rel.relationship_type,
                "confidence": rel.confidence,
            })
        
        return {
            "nodes": list(nodes),
            "edges": edges,
            "total_relationships": len(self.relationships)
        }