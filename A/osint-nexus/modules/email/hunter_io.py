"""
Hunter.io Email Intelligence Module
"""
import httpx

from core.engine import BaseModule
from core.models import Target, TargetType, ModuleResult, Severity


class HunterModule(BaseModule):
    name = "hunter_io"
    description = "Hunter.io email finder and verifier"
    category = "email"
    supported_types = [TargetType.DOMAIN, TargetType.EMAIL]
    requires_api_key = True
    api_key_name = "hunter_io"
    
    async def run(self, target: Target) -> ModuleResult:
        result = ModuleResult(module_name=self.name, target=target.value)
        api_key = self.get_api_key()
        
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                if target.target_type == TargetType.DOMAIN:
                    # Domain search - find all emails
                    resp = await client.get(
                        "https://api.hunter.io/v2/domain-search",
                        params={"domain": target.value, "api_key": api_key, "limit": 100}
                    )
                    
                    if resp.status_code == 200:
                        data = resp.json().get("data", {})
                        emails = data.get("emails", [])
                        
                        result.add_finding(
                            category="email",
                            title=f"Found {len(emails)} emails for {target.value}",
                            description=f"Organization: {data.get('organization', 'Unknown')}",
                            data={
                                "domain": target.value,
                                "organization": data.get("organization"),
                                "email_count": len(emails),
                                "pattern": data.get("pattern"),
                                "emails": [{
                                    "email": e.get("value"),
                                    "type": e.get("type"),
                                    "confidence": e.get("confidence"),
                                    "first_name": e.get("first_name"),
                                    "last_name": e.get("last_name"),
                                    "position": e.get("position"),
                                    "department": e.get("department"),
                                    "linkedin": e.get("linkedin"),
                                    "twitter": e.get("twitter"),
                                } for e in emails]
                            },
                            severity=Severity.INFO,
                            confidence=0.9,
                            tags=["email", "hunter", "enumeration"]
                        )
                        
                        # Individual email findings with social profiles
                        for email_data in emails:
                            if email_data.get("linkedin") or email_data.get("twitter"):
                                result.add_finding(
                                    category="email",
                                    title=f"Employee: {email_data.get('first_name', '')} {email_data.get('last_name', '')}",
                                    description=f"Email: {email_data.get('value')}, Position: {email_data.get('position', 'Unknown')}",
                                    data=email_data,
                                    severity=Severity.LOW,
                                    confidence=email_data.get("confidence", 50) / 100,
                                    tags=["person", "employee"]
                                )
                
                elif target.target_type == TargetType.EMAIL:
                    # Email verification
                    resp = await client.get(
                        "https://api.hunter.io/v2/email-verifier",
                        params={"email": target.value, "api_key": api_key}
                    )
                    
                    if resp.status_code == 200:
                        data = resp.json().get("data", {})
                        
                        result.add_finding(
                            category="email",
                            title=f"Email verification: {target.value}",
                            description=f"Status: {data.get('status')}, Score: {data.get('score')}",
                            data={
                                "email": target.value,
                                "status": data.get("status"),
                                "score": data.get("score"),
                                "regexp": data.get("regexp"),
                                "gibberish": data.get("gibberish"),
                                "disposable": data.get("disposable"),
                                "webmail": data.get("webmail"),
                                "mx_records": data.get("mx_records"),
                                "smtp_server": data.get("smtp_server"),
                                "smtp_check": data.get("smtp_check"),
                                "accept_all": data.get("accept_all"),
                                "block": data.get("block"),
                            },
                            severity=Severity.INFO,
                            confidence=data.get("score", 0) / 100,
                            tags=["email", "verification"]
                        )
                        
        except Exception as e:
            result.add_finding(
                category="email",
                title="Hunter.io lookup failed",
                description=str(e),
                data={"error": str(e)},
                severity=Severity.INFO,
                confidence=0.0,
            )
        
        return result