"""
Website Technology Detection Module
"""
import re
import httpx
import asyncio
from typing import Dict, List, Set

from core.engine import BaseModule
from core.models import Target, TargetType, ModuleResult, Severity


class TechDetectModule(BaseModule):
    name = "tech_detect"
    description = "Detect website technologies, frameworks, and CMS"
    category = "web"
    supported_types = [TargetType.DOMAIN, TargetType.URL]
    requires_api_key = False
    
    # Technology signatures
    SIGNATURES = {
        # CMS
        "WordPress": {
            "headers": [],
            "html": ["wp-content", "wp-includes", "wp-json", "/xmlrpc.php"],
            "meta": ["WordPress"],
        },
        "Drupal": {
            "headers": [("X-Generator", "Drupal")],
            "html": ["sites/default/files", "Drupal.settings"],
            "meta": ["Drupal"],
        },
        "Joomla": {
            "headers": [],
            "html": ["/media/jui/", "Joomla!"],
            "meta": ["Joomla"],
        },
        "Shopify": {
            "headers": [],
            "html": ["cdn.shopify.com", "Shopify.theme"],
            "meta": [],
        },
        # JavaScript Frameworks
        "React": {
            "headers": [],
            "html": ["react.production.min", "__NEXT_DATA__", "data-reactroot"],
            "meta": [],
        },
        "Vue.js": {
            "headers": [],
            "html": ["vue.min.js", "vue.runtime", "data-v-"],
            "meta": [],
        },
        "Angular": {
            "headers": [],
            "html": ["ng-app", "ng-controller", "angular.min.js", "ng-version"],
            "meta": [],
        },
        "jQuery": {
            "headers": [],
            "html": ["jquery.min.js", "jquery-"],
            "meta": [],
        },
        # Web Servers
        "Nginx": {
            "headers": [("Server", "nginx")],
            "html": [],
            "meta": [],
        },
        "Apache": {
            "headers": [("Server", "Apache")],
            "html": [],
            "meta": [],
        },
        "IIS": {
            "headers": [("Server", "Microsoft-IIS")],
            "html": [],
            "meta": [],
        },
        "Cloudflare": {
            "headers": [("Server", "cloudflare"), ("CF-Ray", "")],
            "html": [],
            "meta": [],
        },
        # Analytics
        "Google Analytics": {
            "headers": [],
            "html": ["google-analytics.com", "gtag(", "UA-", "G-"],
            "meta": [],
        },
        "Google Tag Manager": {
            "headers": [],
            "html": ["googletagmanager.com", "GTM-"],
            "meta": [],
        },
        # Security
        "reCAPTCHA": {
            "headers": [],
            "html": ["recaptcha", "g-recaptcha"],
            "meta": [],
        },
        # CDN
        "Cloudflare CDN": {
            "headers": [("CF-Cache-Status", "")],
            "html": ["cdnjs.cloudflare.com"],
            "meta": [],
        },
        "AWS CloudFront": {
            "headers": [("X-Cache", "CloudFront"), ("Via", "cloudfront")],
            "html": ["cloudfront.net"],
            "meta": [],
        },
        # Other
        "Bootstrap": {
            "headers": [],
            "html": ["bootstrap.min.css", "bootstrap.min.js"],
            "meta": [],
        },
        "Font Awesome": {
            "headers": [],
            "html": ["font-awesome", "fontawesome"],
            "meta": [],
        },
        "PHP": {
            "headers": [("X-Powered-By", "PHP")],
            "html": [".php"],
            "meta": [],
        },
        "ASP.NET": {
            "headers": [("X-Powered-By", "ASP.NET"), ("X-AspNet-Version", "")],
            "html": [".aspx", "__VIEWSTATE"],
            "meta": [],
        },
    }
    
    async def run(self, target: Target) -> ModuleResult:
        result = ModuleResult(module_name=self.name, target=target.value)
        
        url = target.value if target.value.startswith("http") else f"https://{target.value}"
        
        try:
            async with httpx.AsyncClient(
                timeout=15, 
                follow_redirects=True,
                verify=False,
                headers={"User-Agent": self.config.get("general", {}).get("user_agent", "")}
            ) as client:
                resp = await client.get(url)
                
                detected: Dict[str, Dict] = {}
                html = resp.text
                headers = dict(resp.headers)
                
                for tech_name, sigs in self.SIGNATURES.items():
                    found = False
                    evidence = []
                    
                    # Check headers
                    for header_check in sigs.get("headers", []):
                        header_name, header_value = header_check
                        if header_name.lower() in {k.lower(): v for k, v in headers.items()}:
                            actual = headers.get(header_name, "")
                            if not header_value or header_value.lower() in actual.lower():
                                found = True
                                evidence.append(f"Header: {header_name}: {actual}")
                    
                    # Check HTML
                    for pattern in sigs.get("html", []):
                        if pattern.lower() in html.lower():
                            found = True
                            evidence.append(f"HTML: {pattern}")
                    
                    # Check meta tags
                    for meta in sigs.get("meta", []):
                        if meta.lower() in html.lower():
                            found = True
                            evidence.append(f"Meta: {meta}")
                    
                    if found:
                        detected[tech_name] = {
                            "evidence": evidence,
                            "confidence": min(len(evidence) * 0.3 + 0.4, 1.0),
                        }
                
                # Security headers check
                security_headers = {
                    "Strict-Transport-Security": headers.get("strict-transport-security"),
                    "Content-Security-Policy": headers.get("content-security-policy"),
                    "X-Frame-Options": headers.get("x-frame-options"),
                    "X-Content-Type-Options": headers.get("x-content-type-options"),
                    "X-XSS-Protection": headers.get("x-xss-protection"),
                    "Referrer-Policy": headers.get("referrer-policy"),
                    "Permissions-Policy": headers.get("permissions-policy"),
                }
                
                missing_headers = [h for h, v in security_headers.items() if not v]
                
                # Technologies finding
                result.add_finding(
                    category="web",
                    title=f"Detected {len(detected)} technologies on {target.value}",
                    description=f"Technologies: {', '.join(detected.keys())}",
                    data={
                        "url": url,
                        "technologies": detected,
                        "response_headers": headers,
                        "status_code": resp.status_code,
                        "content_length": len(html),
                    },
                    severity=Severity.INFO,
                    confidence=0.8,
                    tags=["technology", "fingerprint"]
                )
                
                # Security headers finding
                if missing_headers:
                    result.add_finding(
                        category="web",
                        title=f"⚠️ Missing {len(missing_headers)} security headers",
                        description=f"Missing: {', '.join(missing_headers)}",
                        data={
                            "present": {h: v for h, v in security_headers.items() if v},
                            "missing": missing_headers,
                        },
                        severity=Severity.MEDIUM,
                        confidence=1.0,
                        tags=["security", "headers"]
                    )
                    
        except Exception as e:
            result.add_finding(
                category="web",
                title="Technology detection failed",
                description=str(e),
                data={"error": str(e)},
                severity=Severity.INFO,
                confidence=0.0,
            )
        
        return result