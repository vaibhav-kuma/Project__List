"""
Wayback Machine Module
"""
import httpx
import asyncio
from typing import List

from core.engine import BaseModule
from core.models import Target, TargetType, ModuleResult, Severity


class WaybackModule(BaseModule):
    name = "wayback"
    description = "Wayback Machine historical URL discovery"
    category = "domain"
    supported_types = [TargetType.DOMAIN, TargetType.URL]
    requires_api_key = False
    
    async def run(self, target: Target) -> ModuleResult:
        result = ModuleResult(module_name=self.name, target=target.value)
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                # Get URL list
                resp = await client.get(
                    f"https://web.archive.org/cdx/search/cdx",
                    params={
                        "url": f"*.{target.value}/*",
                        "output": "json",
                        "fl": "original,timestamp,statuscode,mimetype",
                        "limit": "500",
                        "collapse": "urlkey",
                    }
                )
                
                if resp.status_code == 200:
                    data = resp.json()
                    
                    if len(data) > 1:
                        urls = []
                        interesting = []
                        
                        for entry in data[1:]:  # Skip header
                            url = entry[0]
                            timestamp = entry[1]
                            status = entry[2]
                            mimetype = entry[3]
                            
                            urls.append({
                                "url": url,
                                "timestamp": timestamp,
                                "status": status,
                                "mimetype": mimetype,
                            })
                            
                            # Flag interesting files
                            interesting_ext = [
                                '.sql', '.bak', '.old', '.backup', '.log', '.env',
                                '.git', '.svn', '.conf', '.config', '.ini', '.xml',
                                '.json', '.csv', '.xlsx', '.doc', '.pdf', '.key',
                                '.pem', '.crt', '.p12', '.pfx',
                            ]
                            url_lower = url.lower()
                            for ext in interesting_ext:
                                if ext in url_lower:
                                    interesting.append(url)
                                    break
                        
                        result.add_finding(
                            category="wayback",
                            title=f"Found {len(urls)} historical URLs",
                            description=f"Wayback Machine archive for {target.value}",
                            data={
                                "domain": target.value,
                                "total_urls": len(urls),
                                "urls": urls[:100],  # Limit to first 100
                            },
                            severity=Severity.INFO,
                            confidence=1.0,
                            tags=["wayback", "historical"]
                        )
                        
                        if interesting:
                            result.add_finding(
                                category="wayback",
                                title=f"⚡ Found {len(interesting)} potentially sensitive URLs",
                                description="Historical URLs with sensitive file extensions",
                                data={"sensitive_urls": interesting},
                                severity=Severity.MEDIUM,
                                confidence=0.6,
                                tags=["wayback", "sensitive_files"]
                            )
                    
        except Exception as e:
            result.add_finding(
                category="wayback",
                title=f"Wayback Machine lookup failed",
                description=str(e),
                data={"error": str(e)},
                severity=Severity.INFO,
                confidence=0.0,
            )
        
        return result