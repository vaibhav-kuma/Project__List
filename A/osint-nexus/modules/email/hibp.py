"""
Have I Been Pwned Module
"""
import httpx
import asyncio

from core.engine import BaseModule
from core.models import Target, TargetType, ModuleResult, Severity


class HIBPModule(BaseModule):
    name = "hibp"
    description = "Have I Been Pwned breach lookup"
    category = "email"
    supported_types = [TargetType.EMAIL]
    requires_api_key = True
    api_key_name = "haveibeenpwned"
    
    async def run(self, target: Target) -> ModuleResult:
        result = ModuleResult(module_name=self.name, target=target.value)
        
        headers = {
            "hibp-api-key": self.get_api_key(),
            "User-Agent": "OSINT-Nexus",
        }
        
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                # Check breaches
                resp = await client.get(
                    f"https://haveibeenpwned.com/api/v3/breachedaccount/{target.value}",
                    headers=headers,
                    params={"truncateResponse": "false"}
                )
                
                if resp.status_code == 200:
                    breaches = resp.json()
                    
                    result.add_finding(
                        category="breach",
                        title=f"🚨 {len(breaches)} data breaches found for {target.value}",
                        description=f"Email found in {len(breaches)} known data breaches",
                        data={
                            "email": target.value,
                            "breach_count": len(breaches),
                            "breaches": [{
                                "name": b.get("Name"),
                                "title": b.get("Title"),
                                "domain": b.get("Domain"),
                                "breach_date": b.get("BreachDate"),
                                "pwn_count": b.get("PwnCount"),
                                "data_classes": b.get("DataClasses", []),
                                "is_verified": b.get("IsVerified"),
                                "is_sensitive": b.get("IsSensitive"),
                            } for b in breaches]
                        },
                        severity=Severity.HIGH,
                        confidence=1.0,
                        tags=["breach", "hibp", "credentials"]
                    )
                    
                    # Individual breach findings
                    for breach in breaches:
                        severity = Severity.HIGH if breach.get("IsVerified") else Severity.MEDIUM
                        data_types = breach.get("DataClasses", [])
                        
                        if "Passwords" in data_types or "Password hints" in data_types:
                            severity = Severity.CRITICAL
                        
                        result.add_finding(
                            category="breach",
                            title=f"Breach: {breach['Name']} ({breach.get('BreachDate', 'Unknown')})",
                            description=f"Compromised data: {', '.join(data_types)}",
                            data={
                                "breach_name": breach["Name"],
                                "date": breach.get("BreachDate"),
                                "compromised_data": data_types,
                                "accounts_affected": breach.get("PwnCount"),
                            },
                            severity=severity,
                            confidence=1.0 if breach.get("IsVerified") else 0.7,
                            tags=["breach", breach["Name"].lower()]
                        )
                
                elif resp.status_code == 404:
                    result.add_finding(
                        category="breach",
                        title=f"No breaches found for {target.value}",
                        description="Email not found in any known data breaches",
                        data={"email": target.value, "breach_count": 0},
                        severity=Severity.INFO,
                        confidence=1.0,
                        tags=["breach", "clean"]
                    )
                
                # Check pastes
                await asyncio.sleep(1.5)  # HIBP rate limit
                resp2 = await client.get(
                    f"https://haveibeenpwned.com/api/v3/pasteaccount/{target.value}",
                    headers=headers
                )
                
                if resp2.status_code == 200:
                    pastes = resp2.json()
                    result.add_finding(
                        category="breach",
                        title=f"Found in {len(pastes)} paste(s)",
                        description=f"Email appeared in {len(pastes)} public pastes",
                        data={
                            "email": target.value,
                            "paste_count": len(pastes),
                            "pastes": [{
                                "source": p.get("Source"),
                                "id": p.get("Id"),
                                "title": p.get("Title"),
                                "date": p.get("Date"),
                                "email_count": p.get("EmailCount"),
                            } for p in pastes[:20]]
                        },
                        severity=Severity.MEDIUM,
                        confidence=1.0,
                        tags=["paste", "exposure"]
                    )
                    
        except Exception as e:
            result.add_finding(
                category="breach",
                title="HIBP lookup failed",
                description=str(e),
                data={"error": str(e)},
                severity=Severity.INFO,
                confidence=0.0,
            )
        
        return result