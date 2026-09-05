"""
GeoIP Location Module
"""
import asyncio
import httpx

from core.engine import BaseModule
from core.models import Target, TargetType, ModuleResult, Severity


class GeoIPModule(BaseModule):
    name = "geoip"
    description = "IP geolocation and ASN lookup"
    category = "ip"
    supported_types = [TargetType.IP]
    requires_api_key = False
    
    async def run(self, target: Target) -> ModuleResult:
        result = ModuleResult(module_name=self.name, target=target.value)
        
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                # ip-api.com (free, no key)
                resp = await client.get(f"http://ip-api.com/json/{target.value}?fields=66846719")
                
                if resp.status_code == 200:
                    data = resp.json()
                    
                    if data.get("status") == "success":
                        geo_data = {
                            "ip": target.value,
                            "country": data.get("country"),
                            "country_code": data.get("countryCode"),
                            "region": data.get("regionName"),
                            "city": data.get("city"),
                            "zip": data.get("zip"),
                            "latitude": data.get("lat"),
                            "longitude": data.get("lon"),
                            "timezone": data.get("timezone"),
                            "isp": data.get("isp"),
                            "org": data.get("org"),
                            "as": data.get("as"),
                            "asname": data.get("asname"),
                            "mobile": data.get("mobile"),
                            "proxy": data.get("proxy"),
                            "hosting": data.get("hosting"),
                        }
                        
                        result.add_finding(
                            category="geoip",
                            title=f"GeoIP: {target.value} → {data.get('city')}, {data.get('country')}",
                            description=f"ISP: {data.get('isp')}, Org: {data.get('org')}",
                            data=geo_data,
                            severity=Severity.INFO,
                            confidence=0.85,
                            tags=["geoip", "location"]
                        )
                        
                        # Flag proxy/VPN/hosting
                        if data.get("proxy"):
                            result.add_finding(
                                category="geoip",
                                title=f"⚡ IP is a Proxy/VPN",
                                description=f"{target.value} is detected as proxy/VPN",
                                data=geo_data,
                                severity=Severity.MEDIUM,
                                confidence=0.7,
                                tags=["proxy", "vpn"]
                            )
                        
                        if data.get("hosting"):
                            result.add_finding(
                                category="geoip",
                                title=f"IP is hosted/datacenter",
                                description=f"{target.value} belongs to hosting provider: {data.get('org')}",
                                data=geo_data,
                                severity=Severity.LOW,
                                confidence=0.8,
                                tags=["hosting", "datacenter"]
                            )
                
        except Exception as e:
            result.add_finding(
                category="geoip",
                title=f"GeoIP lookup failed",
                description=str(e),
                data={"error": str(e)},
                severity=Severity.INFO,
                confidence=0.0,
            )
        
        return result