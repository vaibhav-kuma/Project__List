"""
Shodan Intelligence Module
"""
import asyncio
import shodan

from core.engine import BaseModule
from core.models import Target, TargetType, ModuleResult, Severity


class ShodanModule(BaseModule):
    name = "shodan"
    description = "Shodan IoT/Infrastructure intelligence"
    category = "ip"
    supported_types = [TargetType.IP, TargetType.DOMAIN]
    requires_api_key = True
    api_key_name = "shodan"
    
    async def run(self, target: Target) -> ModuleResult:
        result = ModuleResult(module_name=self.name, target=target.value)
        api = shodan.Shodan(self.get_api_key())
        
        try:
            if target.target_type == TargetType.DOMAIN:
                # DNS lookup first
                info = await asyncio.get_event_loop().run_in_executor(
                    None, api.dns.resolve, target.value
                )
                # Search by domain
                search_result = await asyncio.get_event_loop().run_in_executor(
                    None, api.search, f"hostname:{target.value}"
                )
                
                result.add_finding(
                    category="shodan",
                    title=f"Shodan results for {target.value}",
                    description=f"Found {search_result['total']} results",
                    data={
                        "total": search_result['total'],
                        "matches": [{
                            "ip": m.get("ip_str"),
                            "port": m.get("port"),
                            "org": m.get("org"),
                            "product": m.get("product"),
                            "version": m.get("version"),
                            "os": m.get("os"),
                            "hostnames": m.get("hostnames", []),
                        } for m in search_result.get("matches", [])[:20]]
                    },
                    severity=Severity.INFO,
                    confidence=1.0,
                    tags=["shodan", "infrastructure"]
                )
                
            else:
                # Direct IP lookup
                host = await asyncio.get_event_loop().run_in_executor(
                    None, api.host, target.value
                )
                
                ports = host.get("ports", [])
                vulns = host.get("vulns", [])
                
                data = {
                    "ip": host.get("ip_str"),
                    "organization": host.get("org"),
                    "operating_system": host.get("os"),
                    "ports": ports,
                    "hostnames": host.get("hostnames", []),
                    "domains": host.get("domains", []),
                    "country": host.get("country_name"),
                    "city": host.get("city"),
                    "isp": host.get("isp"),
                    "asn": host.get("asn"),
                    "vulns": vulns,
                    "last_update": host.get("last_update"),
                }
                
                result.add_finding(
                    category="shodan",
                    title=f"Shodan Host Info: {target.value}",
                    description=f"Org: {host.get('org')}, Ports: {len(ports)}, Vulns: {len(vulns)}",
                    data=data,
                    severity=Severity.INFO,
                    confidence=1.0,
                    tags=["shodan", "host"]
                )
                
                # Flag open ports
                if ports:
                    dangerous_ports = {
                        21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP",
                        445: "SMB", 1433: "MSSQL", 3306: "MySQL",
                        3389: "RDP", 5432: "PostgreSQL", 5900: "VNC",
                        6379: "Redis", 27017: "MongoDB", 9200: "Elasticsearch"
                    }
                    for port in ports:
                        if port in dangerous_ports:
                            result.add_finding(
                                category="shodan",
                                title=f"⚠️ Exposed Service: {dangerous_ports[port]} (port {port})",
                                description=f"Potentially dangerous service exposed on port {port}",
                                data={"ip": target.value, "port": port, "service": dangerous_ports[port]},
                                severity=Severity.HIGH,
                                confidence=0.9,
                                tags=["open_port", "exposure"]
                            )
                
                # Flag vulnerabilities
                if vulns:
                    for vuln in vulns:
                        result.add_finding(
                            category="shodan",
                            title=f"🚨 Vulnerability: {vuln}",
                            description=f"CVE found by Shodan",
                            data={"ip": target.value, "cve": vuln},
                            severity=Severity.CRITICAL,
                            confidence=0.8,
                            tags=["vulnerability", "cve"]
                        )
                
                # Services detail
                for service in host.get("data", []):
                    result.add_finding(
                        category="shodan",
                        title=f"Service on port {service.get('port')}: {service.get('product', 'Unknown')}",
                        description=service.get("data", "")[:200],
                        data={
                            "port": service.get("port"),
                            "transport": service.get("transport"),
                            "product": service.get("product"),
                            "version": service.get("version"),
                            "banner": service.get("data", "")[:500],
                        },
                        severity=Severity.LOW,
                        confidence=1.0,
                        tags=["service", "banner"]
                    )
        
        except shodan.APIError as e:
            result.add_finding(
                category="shodan",
                title=f"Shodan lookup info",
                description=str(e),
                data={"error": str(e)},
                severity=Severity.INFO,
                confidence=0.0,
            )
        
        return result