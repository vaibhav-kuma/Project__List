"""
WHOIS Lookup Module
"""
import whois
import asyncio
from typing import List

from core.engine import BaseModule
from core.models import Target, TargetType, ModuleResult, Finding, Severity


class WhoisModule(BaseModule):
    name = "whois"
    description = "WHOIS domain registration lookup"
    category = "domain"
    supported_types = [TargetType.DOMAIN]
    requires_api_key = False
    
    async def run(self, target: Target) -> ModuleResult:
        result = ModuleResult(module_name=self.name, target=target.value)
        
        try:
            w = await asyncio.get_event_loop().run_in_executor(
                None, whois.whois, target.value
            )
            
            data = {
                "domain_name": w.domain_name,
                "registrar": w.registrar,
                "whois_server": w.whois_server,
                "creation_date": str(w.creation_date),
                "expiration_date": str(w.expiration_date),
                "updated_date": str(w.updated_date),
                "name_servers": w.name_servers if isinstance(w.name_servers, list) else [w.name_servers],
                "status": w.status if isinstance(w.status, list) else [w.status],
                "emails": w.emails if isinstance(w.emails, list) else [w.emails],
                "registrant": {
                    "name": getattr(w, 'name', None),
                    "org": getattr(w, 'org', None),
                    "address": getattr(w, 'address', None),
                    "city": getattr(w, 'city', None),
                    "state": getattr(w, 'state', None),
                    "zipcode": getattr(w, 'zipcode', None),
                    "country": getattr(w, 'country', None),
                },
                "dnssec": getattr(w, 'dnssec', None),
            }
            
            result.add_finding(
                category="whois",
                title=f"WHOIS Record for {target.value}",
                description=f"Registrar: {w.registrar}, Created: {w.creation_date}",
                data=data,
                severity=Severity.INFO,
                confidence=1.0,
                tags=["whois", "registration"]
            )
            
            # Check for privacy protection
            if w.emails:
                emails = w.emails if isinstance(w.emails, list) else [w.emails]
                for email in emails:
                    if email:
                        result.add_finding(
                            category="whois",
                            title=f"Contact email found: {email}",
                            description=f"Email associated with domain registration",
                            data={"email": email, "domain": target.value},
                            severity=Severity.LOW,
                            confidence=0.9,
                            tags=["email", "contact"]
                        )
            
        except Exception as e:
            result.add_finding(
                category="whois",
                title=f"WHOIS lookup failed for {target.value}",
                description=str(e),
                data={"error": str(e)},
                severity=Severity.INFO,
                confidence=0.0,
            )
        
        return result