"""
AbuseIPDB Module - Check IP reputation
"""
import httpx
import asyncio

from core.engine import BaseModule
from core.models import Target, TargetType, ModuleResult, Severity


class AbuseIPDBModule(BaseModule):
    name = "abuseipdb"
    description = "Check IP abuse reports and reputation"
    category = "ip"
    supported_types = [TargetType.IP]
    requires_api_key = True
    api_key_name = "abuseipdb"
    
    async def run(self, target: Target) -> ModuleResult:
        result = ModuleResult(module_name=self.name, target=target.value)
        
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    "https://api.abuseipdb.com/api/v2/check",
                    params={
                        "ipAddress": target.value,
                        "maxAgeInDays": 90,
                        "verbose": True,
                    },
                    headers={
                        "Key": self.get_api_key(),
                        "Accept": "application/json",
                    }
                )
                
                if resp.status_code == 200:
                    data = resp.json().get("data", {})
                    
                    abuse_score = data.get("abuseConfidenceScore", 0)
                    total_reports = data.get("totalReports", 0)
                    
                    severity = Severity.INFO
                    if abuse_score > 75:
                        severity = Severity.CRITICAL
                    elif abuse_score > 50:
                        severity = Severity.HIGH
                    elif abuse_score > 25:
                        severity = Severity.MEDIUM
                    elif abuse_score > 0:
                        severity = Severity.LOW
                    
                    result.add_finding(
                        category="threat_intel",
                        title=f"AbuseIPDB Score: {abuse_score}% for {target.value}",
                        description=f"Total reports: {total_reports}, ISP: {data.get('isp')}",
                        data={
                            "ip": target.value,
                            "abuse_score": abuse_score,
                            "total_reports": total_reports,
                            "country": data.get("countryCode"),
                            "isp": data.get("isp"),
                            "domain": data.get("domain"),
                            "usage_type": data.get("usageType"),
                            "is_tor": data.get("isTor"),
                            "is_whitelisted": data.get("isWhitelisted"),
                            "last_reported": data.get("lastReportedAt"),
                        },
                        severity=severity,
                        confidence=abuse_score / 100.0,
                        tags=["abuse", "reputation", "threat_intel"]
                    )
                    
        except Exception as e:
            result.add_finding(
                category="threat_intel",
                title="AbuseIPDB lookup failed",
                description=str(e),
                data={"error": str(e)},
                severity=Severity.INFO,
                confidence=0.0,
            )
        
        return result