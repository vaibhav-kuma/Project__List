"""
Google Dorking Module — Automated Google Dork Queries
"""
import asyncio
import urllib.parse
import httpx

from core.engine import BaseModule
from core.models import Target, TargetType, ModuleResult, Severity


class GoogleDorkModule(BaseModule):
    name = "google_dorking"
    description = "Automated Google dork queries for information discovery"
    category = "web"
    supported_types = [TargetType.DOMAIN]
    requires_api_key = False
    
    DORKS = {
        "Exposed Files": [
            'site:{target} filetype:pdf',
            'site:{target} filetype:doc OR filetype:docx',
            'site:{target} filetype:xls OR filetype:xlsx',
            'site:{target} filetype:sql',
            'site:{target} filetype:log',
            'site:{target} filetype:env',
            'site:{target} filetype:bak',
            'site:{target} filetype:conf OR filetype:config',
            'site:{target} filetype:xml',
            'site:{target} filetype:json',
        ],
        "Login Pages": [
            'site:{target} inurl:login',
            'site:{target} inurl:admin',
            'site:{target} inurl:signin',
            'site:{target} intitle:"login"',
            'site:{target} intitle:"admin panel"',
            'site:{target} inurl:dashboard',
        ],
        "Sensitive Info": [
            'site:{target} intext:"password"',
            'site:{target} intext:"api_key"',
            'site:{target} intext:"secret_key"',
            'site:{target} "index of /"',
            'site:{target} intitle:"index of"',
            'site:{target} inurl:".git"',
            'site:{target} inurl:".env"',
            'site:{target} inurl:"wp-config"',
        ],
        "Error Messages": [
            'site:{target} "SQL syntax" OR "mysql_fetch"',
            'site:{target} "Warning:" OR "Error:"',
            'site:{target} "Stack Trace" OR "Traceback"',
            'site:{target} "phpinfo()"',
        ],
        "Subdomains": [
            'site:*.{target} -www',
        ],
        "Third Party": [
            '"{target}" site:pastebin.com',
            '"{target}" site:github.com',
            '"{target}" site:trello.com',
            '"{target}" site:stackoverflow.com',
        ],
    }
    
    async def run(self, target: Target) -> ModuleResult:
        result = ModuleResult(module_name=self.name, target=target.value)
        
        all_dorks = {}
        for category, dorks in self.DORKS.items():
            formatted = [d.format(target=target.value) for d in dorks]
            all_dorks[category] = formatted
        
        result.add_finding(
            category="web",
            title=f"Generated {sum(len(d) for d in all_dorks.values())} Google dorks for {target.value}",
            description="Use these dorks in Google search for manual investigation",
            data={
                "domain": target.value,
                "dork_categories": all_dorks,
                "total_dorks": sum(len(d) for d in all_dorks.values()),
                "instructions": "Copy these dorks into Google search. For automated results, add Google CSE API key.",
            },
            severity=Severity.INFO,
            confidence=1.0,
            tags=["dorking", "google", "reconnaissance"]
        )
        
        # If Google CSE API key is available, actually run some queries
        cse_key = self.api_keys.get("google_cse_key")
        cse_cx = self.api_keys.get("google_cse_cx")
        
        if cse_key and cse_cx:
            async with httpx.AsyncClient(timeout=15) as client:
                # Run a subset of dorks via API
                priority_dorks = [
                    f'site:{target.value} filetype:sql OR filetype:env OR filetype:log',
                    f'site:{target.value} inurl:admin OR inurl:login',
                    f'site:{target.value} intitle:"index of"',
                ]
                
                for dork in priority_dorks:
                    try:
                        resp = await client.get(
                            "https://www.googleapis.com/customsearch/v1",
                            params={
                                "key": cse_key,
                                "cx": cse_cx,
                                "q": dork,
                                "num": 10,
                            }
                        )
                        
                        if resp.status_code == 200:
                            search_data = resp.json()
                            items = search_data.get("items", [])
                            
                            if items:
                                result.add_finding(
                                    category="web",
                                    title=f"Google dork results: {dork[:60]}...",
                                    description=f"Found {len(items)} results",
                                    data={
                                        "dork": dork,
                                        "results": [{
                                            "title": i.get("title"),
                                            "url": i.get("link"),
                                            "snippet": i.get("snippet"),
                                        } for i in items]
                                    },
                                    severity=Severity.MEDIUM,
                                    confidence=0.8,
                                    tags=["dorking", "results"]
                                )
                        
                        await asyncio.sleep(1)  # Rate limit
                        
                    except Exception:
                        pass
        
        return result