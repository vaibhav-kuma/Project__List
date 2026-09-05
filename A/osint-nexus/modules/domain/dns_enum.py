"""
DNS Enumeration Module
"""
import dns.resolver
import dns.reversename
import asyncio
from typing import List, Dict

from core.engine import BaseModule
from core.models import Target, TargetType, ModuleResult, Finding, Severity


class DNSEnumModule(BaseModule):
    name = "dns_enum"
    description = "Comprehensive DNS enumeration"
    category = "domain"
    supported_types = [TargetType.DOMAIN]
    requires_api_key = False
    
    RECORD_TYPES = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'SOA', 'CNAME', 'SRV', 'CAA', 'PTR']
    
    async def run(self, target: Target) -> ModuleResult:
        result = ModuleResult(module_name=self.name, target=target.value)
        
        all_records = {}
        
        for record_type in self.RECORD_TYPES:
            try:
                answers = await asyncio.get_event_loop().run_in_executor(
                    None, self._resolve, target.value, record_type
                )
                
                if answers:
                    records = []
                    for rdata in answers:
                        record_str = str(rdata)
                        records.append(record_str)
                    
                    all_records[record_type] = records
                    
                    result.add_finding(
                        category="dns",
                        title=f"{record_type} Records for {target.value}",
                        description=f"Found {len(records)} {record_type} records",
                        data={
                            "domain": target.value,
                            "record_type": record_type,
                            "records": records,
                        },
                        severity=Severity.INFO,
                        confidence=1.0,
                        tags=["dns", record_type.lower()]
                    )
                    
                    # Extract IPs from A records
                    if record_type == 'A':
                        for ip in records:
                            result.add_finding(
                                category="dns",
                                title=f"IP Address: {ip}",
                                description=f"{target.value} resolves to {ip}",
                                data={"domain": target.value, "ip": ip, "record_type": "A"},
                                severity=Severity.INFO,
                                confidence=1.0,
                                tags=["ip", "dns"]
                            )
                    
                    # Check for SPF/DMARC/DKIM in TXT records
                    if record_type == 'TXT':
                        for txt in records:
                            if 'v=spf1' in txt:
                                result.add_finding(
                                    category="dns",
                                    title="SPF Record Found",
                                    description=txt,
                                    data={"spf": txt, "domain": target.value},
                                    severity=Severity.INFO,
                                    confidence=1.0,
                                    tags=["spf", "email_security"]
                                )
                            if 'v=DMARC1' in txt:
                                result.add_finding(
                                    category="dns",
                                    title="DMARC Record Found",
                                    description=txt,
                                    data={"dmarc": txt, "domain": target.value},
                                    severity=Severity.INFO,
                                    confidence=1.0,
                                    tags=["dmarc", "email_security"]
                                )
                    
                    # Check MX records for email providers
                    if record_type == 'MX':
                        for mx in records:
                            mx_lower = mx.lower()
                            provider = "Unknown"
                            if "google" in mx_lower or "gmail" in mx_lower:
                                provider = "Google Workspace"
                            elif "outlook" in mx_lower or "microsoft" in mx_lower:
                                provider = "Microsoft 365"
                            elif "protonmail" in mx_lower:
                                provider = "ProtonMail"
                            
                            result.add_finding(
                                category="dns",
                                title=f"Mail Server: {mx}",
                                description=f"Email provider: {provider}",
                                data={"mx": mx, "provider": provider, "domain": target.value},
                                severity=Severity.INFO,
                                confidence=0.8,
                                tags=["mx", "email"]
                            )
                            
            except Exception:
                pass
        
        # Zone transfer attempt
        try:
            ns_records = all_records.get('NS', [])
            for ns in ns_records:
                try:
                    zone = await asyncio.get_event_loop().run_in_executor(
                        None, self._try_zone_transfer, target.value, ns.rstrip('.')
                    )
                    if zone:
                        result.add_finding(
                            category="dns",
                            title=f"⚠️ Zone Transfer Possible on {ns}",
                            description="DNS Zone Transfer (AXFR) is enabled - security risk!",
                            data={"nameserver": ns, "zone_data": zone[:1000]},
                            severity=Severity.HIGH,
                            confidence=1.0,
                            tags=["zone_transfer", "vulnerability"]
                        )
                except Exception:
                    pass
        except Exception:
            pass
        
        return result
    
    def _resolve(self, domain: str, record_type: str):
        try:
            resolver = dns.resolver.Resolver()
            resolver.timeout = 10
            resolver.lifetime = 10
            return resolver.resolve(domain, record_type)
        except Exception:
            return None
    
    def _try_zone_transfer(self, domain: str, nameserver: str):
        try:
            import dns.zone
            import dns.query
            zone = dns.zone.from_xfr(dns.query.xfr(nameserver, domain, timeout=10))
            records = []
            for name, node in zone.nodes.items():
                records.append(str(name))
            return records
        except Exception:
            return None