"""
Subdomain Enumeration Module
Combines multiple techniques: brute force, certificate transparency, APIs
"""
import asyncio
import json
import ssl
import socket
from typing import Set

import httpx
import dns.resolver

from core.engine import BaseModule
from core.models import Target, TargetType, ModuleResult, Severity


class SubdomainModule(BaseModule):
    name = "subdomain_enum"
    description = "Subdomain enumeration via multiple sources"
    category = "domain"
    supported_types = [TargetType.DOMAIN]
    requires_api_key = False
    
    # Common subdomain wordlist
    COMMON_SUBDOMAINS = [
        "www", "mail", "ftp", "admin", "blog", "dev", "staging", "test",
        "api", "app", "beta", "cdn", "cloud", "cpanel", "dashboard",
        "db", "demo", "dns", "docs", "email", "git", "gitlab", "grafana",
        "graphql", "help", "host", "hub", "internal", "jenkins", "jira",
        "kibana", "login", "manage", "monitor", "mysql", "ns1", "ns2",
        "office", "panel", "portal", "prod", "proxy", "redis", "remote",
        "repo", "rest", "search", "secure", "server", "shop", "smtp",
        "sql", "ssh", "ssl", "stage", "static", "status", "store",
        "support", "syslog", "tools", "vpn", "webmail", "wiki", "ws",
        "mx", "pop", "imap", "autodiscover", "autoconfig", "m", "mobile",
        "old", "new", "v1", "v2", "sandbox", "preview", "uat", "qa",
    ]
    
    async def run(self, target: Target) -> ModuleResult:
        result = ModuleResult(module_name=self.name, target=target.value)
        domain = target.value
        
        subdomains: Set[str] = set()
        
        # Method 1: Certificate Transparency Logs (crt.sh)
        crt_subs = await self._crtsh_enum(domain)
        subdomains.update(crt_subs)
        
        # Method 2: DNS Brute Force
        brute_subs = await self._dns_bruteforce(domain)
        subdomains.update(brute_subs)
        
        # Method 3: ThreatCrowd API
        tc_subs = await self._threatcrowd_enum(domain)
        subdomains.update(tc_subs)
        
        # Method 4: HackerTarget API
        ht_subs = await self._hackertarget_enum(domain)
        subdomains.update(ht_subs)
        
        # Method 5: AlienVault OTX
        otx_subs = await self._otx_enum(domain)
        subdomains.update(otx_subs)
        
        # Method 6: URLScan.io
        urlscan_subs = await self._urlscan_enum(domain)
        subdomains.update(urlscan_subs)
        
        # Clean results
        subdomains = {s.lower().strip().rstrip('.') for s in subdomains if s and domain in s}
        
        # Resolve subdomains
        resolved = {}
        for sub in subdomains:
            try:
                ip = await asyncio.get_event_loop().run_in_executor(
                    None, self._resolve_domain, sub
                )
                if ip:
                    resolved[sub] = ip
            except Exception:
                pass
        
        # Add findings
        result.add_finding(
            category="subdomain",
            title=f"Found {len(subdomains)} subdomains for {domain}",
            description=f"Enumeration discovered {len(subdomains)} subdomains, {len(resolved)} resolved",
            data={
                "domain": domain,
                "subdomains": sorted(list(subdomains)),
                "resolved": resolved,
                "total": len(subdomains),
                "resolved_count": len(resolved),
                "sources": ["crt.sh", "dns_bruteforce", "threatcrowd", "hackertarget", "otx", "urlscan"]
            },
            severity=Severity.INFO,
            confidence=0.9,
            tags=["subdomain", "enumeration"]
        )
        
        # Flag interesting subdomains
        interesting_keywords = ["admin", "internal", "staging", "dev", "test", "jenkins", "git", "vpn", "db"]
        for sub in subdomains:
            for keyword in interesting_keywords:
                if keyword in sub:
                    result.add_finding(
                        category="subdomain",
                        title=f"⚡ Interesting subdomain: {sub}",
                        description=f"Contains keyword '{keyword}' - potential attack surface",
                        data={"subdomain": sub, "keyword": keyword, "ip": resolved.get(sub)},
                        severity=Severity.MEDIUM,
                        confidence=0.7,
                        tags=["interesting", keyword]
                    )
                    break
        
        return result
    
    async def _crtsh_enum(self, domain: str) -> Set[str]:
        """Certificate Transparency via crt.sh"""
        subdomains = set()
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(f"https://crt.sh/?q=%.{domain}&output=json")
                if resp.status_code == 200:
                    data = resp.json()
                    for entry in data:
                        name = entry.get("name_value", "")
                        for sub in name.split("\n"):
                            sub = sub.strip().lstrip("*.")
                            if sub and domain in sub:
                                subdomains.add(sub)
        except Exception:
            pass
        return subdomains
    
    async def _dns_bruteforce(self, domain: str) -> Set[str]:
        """DNS brute force with common subdomain names"""
        subdomains = set()
        
        async def check_subdomain(sub):
            fqdn = f"{sub}.{domain}"
            try:
                result = await asyncio.get_event_loop().run_in_executor(
                    None, self._resolve_domain, fqdn
                )
                if result:
                    subdomains.add(fqdn)
            except Exception:
                pass
        
        tasks = [check_subdomain(sub) for sub in self.COMMON_SUBDOMAINS]
        await asyncio.gather(*tasks)
        return subdomains
    
    async def _threatcrowd_enum(self, domain: str) -> Set[str]:
        subdomains = set()
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(
                    f"https://www.threatcrowd.org/searchApi/v2/domain/report/?domain={domain}"
                )
                if resp.status_code == 200:
                    data = resp.json()
                    subdomains.update(data.get("subdomains", []))
        except Exception:
            pass
        return subdomains
    
    async def _hackertarget_enum(self, domain: str) -> Set[str]:
        subdomains = set()
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(f"https://api.hackertarget.com/hostsearch/?q={domain}")
                if resp.status_code == 200 and "error" not in resp.text.lower():
                    for line in resp.text.strip().split("\n"):
                        parts = line.split(",")
                        if parts:
                            subdomains.add(parts[0])
        except Exception:
            pass
        return subdomains
    
    async def _otx_enum(self, domain: str) -> Set[str]:
        subdomains = set()
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(
                    f"https://otx.alienvault.com/api/v1/indicators/domain/{domain}/passive_dns"
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for entry in data.get("passive_dns", []):
                        hostname = entry.get("hostname", "")
                        if hostname and domain in hostname:
                            subdomains.add(hostname)
        except Exception:
            pass
        return subdomains
    
    async def _urlscan_enum(self, domain: str) -> Set[str]:
        subdomains = set()
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(
                    f"https://urlscan.io/api/v1/search/?q=domain:{domain}&size=100"
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for result in data.get("results", []):
                        page = result.get("page", {})
                        hostname = page.get("domain", "")
                        if hostname and domain in hostname:
                            subdomains.add(hostname)
        except Exception:
            pass
        return subdomains
    
    def _resolve_domain(self, domain: str) -> str:
        try:
            answers = dns.resolver.resolve(domain, 'A', lifetime=5)
            return str(answers[0])
        except Exception:
            return ""