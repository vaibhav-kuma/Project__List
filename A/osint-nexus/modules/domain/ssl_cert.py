"""
SSL Certificate Analysis Module
"""
import ssl
import socket
import asyncio
from datetime import datetime
import hashlib

from core.engine import BaseModule
from core.models import Target, TargetType, ModuleResult, Severity


class SSLCertModule(BaseModule):
    name = "ssl_cert"
    description = "SSL/TLS certificate analysis"
    category = "domain"
    supported_types = [TargetType.DOMAIN]
    requires_api_key = False
    
    async def run(self, target: Target) -> ModuleResult:
        result = ModuleResult(module_name=self.name, target=target.value)
        
        try:
            cert_info = await asyncio.get_event_loop().run_in_executor(
                None, self._get_cert, target.value
            )
            
            if cert_info:
                # Extract details
                subject = dict(x[0] for x in cert_info.get('subject', ()))
                issuer = dict(x[0] for x in cert_info.get('issuer', ()))
                
                san = []
                for ext in cert_info.get('subjectAltName', ()):
                    san.append(ext[1])
                
                not_before = cert_info.get('notBefore', '')
                not_after = cert_info.get('notAfter', '')
                serial = cert_info.get('serialNumber', '')
                
                # Check expiration
                try:
                    exp_date = datetime.strptime(not_after, '%b %d %H:%M:%S %Y %Z')
                    days_left = (exp_date - datetime.utcnow()).days
                except:
                    days_left = -1
                
                data = {
                    "subject": subject,
                    "issuer": issuer,
                    "serial_number": serial,
                    "not_before": not_before,
                    "not_after": not_after,
                    "days_until_expiry": days_left,
                    "san": san,
                    "version": cert_info.get('version'),
                    "signature_algorithm": cert_info.get('signatureAlgorithm', 'Unknown'),
                }
                
                result.add_finding(
                    category="ssl",
                    title=f"SSL Certificate for {target.value}",
                    description=f"Issuer: {issuer.get('organizationName', 'Unknown')}, Expires in {days_left} days",
                    data=data,
                    severity=Severity.INFO,
                    confidence=1.0,
                    tags=["ssl", "certificate"]
                )
                
                # Warn about expiring certs
                if days_left < 30 and days_left >= 0:
                    result.add_finding(
                        category="ssl",
                        title=f"⚠️ Certificate expiring soon ({days_left} days)",
                        description=f"SSL certificate expires on {not_after}",
                        data=data,
                        severity=Severity.HIGH,
                        confidence=1.0,
                        tags=["ssl", "expiring"]
                    )
                elif days_left < 0:
                    result.add_finding(
                        category="ssl",
                        title=f"🚨 Certificate EXPIRED",
                        description=f"SSL certificate expired on {not_after}",
                        data=data,
                        severity=Severity.CRITICAL,
                        confidence=1.0,
                        tags=["ssl", "expired"]
                    )
                
                # SAN domains discovery
                if san:
                    result.add_finding(
                        category="ssl",
                        title=f"Found {len(san)} domains in SAN",
                        description=f"Subject Alternative Names reveal additional domains",
                        data={"san_domains": san, "domain": target.value},
                        severity=Severity.LOW,
                        confidence=1.0,
                        tags=["ssl", "san", "domains"]
                    )
                
        except Exception as e:
            result.add_finding(
                category="ssl",
                title=f"SSL analysis failed for {target.value}",
                description=str(e),
                data={"error": str(e)},
                severity=Severity.INFO,
                confidence=0.0,
            )
        
        return result
    
    def _get_cert(self, hostname: str, port: int = 443) -> dict:
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=hostname) as s:
            s.settimeout(10)
            s.connect((hostname, port))
            cert = s.getpeercert()
            return cert