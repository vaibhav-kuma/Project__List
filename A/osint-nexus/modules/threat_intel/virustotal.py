"""
VirusTotal Intelligence Module
"""
import httpx
import asyncio

from core.engine import BaseModule
from core.models import Target, TargetType, ModuleResult, Severity


class VirusTotalModule(BaseModule):
    name = "virustotal"
    description = "VirusTotal malware and threat analysis"
    category = "threat_intel"
    supported_types = [TargetType.DOMAIN, TargetType.IP, TargetType.URL, TargetType.HASH]
    requires_api_key = True
    api_key_name = "virustotal"
    
    VT_BASE = "https://www.virustotal.com/api/v3"
    
    async def run(self, target: Target) -> ModuleResult:
        result = ModuleResult(module_name=self.name, target=target.value)
        headers = {"x-apikey": self.get_api_key()}
        
        try:
            async with httpx.AsyncClient(timeout=20, headers=headers) as client:
                if target.target_type == TargetType.DOMAIN:
                    resp = await client.get(f"{self.VT_BASE}/domains/{target.value}")
                elif target.target_type == TargetType.IP:
                    resp = await client.get(f"{self.VT_BASE}/ip_addresses/{target.value}")
                elif target.target_type == TargetType.HASH:
                    resp = await client.get(f"{self.VT_BASE}/files/{target.value}")
                else:
                    return result
                
                if resp.status_code == 200:
                    data = resp.json().get("data", {})
                    attrs = data.get("attributes", {})
                    
                    # Analysis stats
                    stats = attrs.get("last_analysis_stats", {})
                    malicious = stats.get("malicious", 0)
                    suspicious = stats.get("suspicious", 0)
                    harmless = stats.get("harmless", 0)
                    undetected = stats.get("undetected", 0)
                    total = malicious + suspicious + harmless + undetected
                    
                    severity = Severity.INFO
                    if malicious > 5:
                        severity = Severity.CRITICAL
                    elif malicious > 0:
                        severity = Severity.HIGH
                    elif suspicious > 0:
                        severity = Severity.MEDIUM
                    
                    vt_data = {
                        "target": target.value,
                        "type": target.target_type.value,
                        "malicious": malicious,
                        "suspicious": suspicious,
                        "harmless": harmless,
                        "undetected": undetected,
                        "total_scanners": total,
                        "reputation": attrs.get("reputation"),
                        "categories": attrs.get("categories", {}),
                        "last_analysis_date": attrs.get("last_analysis_date"),
                        "tags": attrs.get("tags", []),
                    }
                    
                    # Add type-specific data
                    if target.target_type == TargetType.DOMAIN:
                        vt_data.update({
                            "registrar": attrs.get("registrar"),
                            "creation_date": attrs.get("creation_date"),
                            "whois": attrs.get("whois", "")[:500],
                            "dns_records": attrs.get("last_dns_records", []),
                            "popularity_ranks": attrs.get("popularity_ranks", {}),
                        })
                    elif target.target_type == TargetType.IP:
                        vt_data.update({
                            "asn": attrs.get("asn"),
                            "as_owner": attrs.get("as_owner"),
                            "country": attrs.get("country"),
                            "network": attrs.get("network"),
                        })
                    
                    result.add_finding(
                        category="threat_intel",
                        title=f"VirusTotal: {malicious}/{total} detections for {target.value}",
                        description=f"Malicious: {malicious}, Suspicious: {suspicious}",
                        data=vt_data,
                        severity=severity,
                        confidence=malicious / max(total, 1),
                        source_url=f"https://www.virustotal.com/gui/{target.target_type.value}/{target.value}",
                        tags=["virustotal", "threat_intel", "malware"]
                    )
                    
                    # Get detailed scan results if malicious
                    if malicious > 0:
                        scan_results = attrs.get("last_analysis_results", {})
                        detected_by = {
                            engine: info for engine, info in scan_results.items()
                            if info.get("category") == "malicious"
                        }
                        
                        result.add_finding(
                            category="threat_intel",
                            title=f"🚨 Detected as malicious by {malicious} engines",
                            description=f"Engines: {', '.join(list(detected_by.keys())[:10])}",
                            data={"detected_by": detected_by},
                            severity=Severity.CRITICAL if malicious > 5 else Severity.HIGH,
                            confidence=0.9,
                            tags=["malicious", "detection"]
                        )
                        
        except Exception as e:
            result.add_finding(
                category="threat_intel",
                title="VirusTotal lookup failed",
                description=str(e),
                data={"error": str(e)},
                severity=Severity.INFO,
                confidence=0.0,
            )
        
        return result