"""
Core OSINT Engine - Orchestrates all modules
"""
import asyncio
import importlib
import time
import yaml
from pathlib import Path
from typing import List, Dict, Optional, Type
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
from rich.table import Table
from rich.panel import Panel
from rich.live import Live

from core.models import (
    Target, TargetType, Investigation, ModuleResult, 
    ModuleStatus, Finding, Severity
)
from core.correlator import DataCorrelator
from core.rate_limiter import RateLimiter
from core.export import ReportGenerator
from database.db_manager import DatabaseManager
from utils.logger import setup_logger
from utils.validators import InputValidator

console = Console()
logger = setup_logger(__name__)


class BaseModule:
    """Base class for all OSINT modules"""
    
    name: str = "base_module"
    description: str = "Base module"
    category: str = "general"
    supported_types: List[TargetType] = []
    requires_api_key: bool = False
    api_key_name: str = ""
    
    def __init__(self, config: dict):
        self.config = config
        self.api_keys = config.get("api_keys", {})
        self.rate_limiter = RateLimiter(
            config.get("rate_limits", {}).get(self.name, 30)
        )
        self.session = None
        self.result = ModuleResult(module_name=self.name)
    
    def get_api_key(self) -> Optional[str]:
        key = self.api_keys.get(self.api_key_name, "")
        return key if key else None
    
    def is_available(self) -> bool:
        if self.requires_api_key and not self.get_api_key():
            return False
        return True
    
    async def run(self, target: Target) -> ModuleResult:
        """Override this method in each module"""
        raise NotImplementedError
    
    async def execute(self, target: Target) -> ModuleResult:
        """Wrapper that handles timing, errors, rate limiting"""
        self.result = ModuleResult(
            module_name=self.name,
            target=target.value,
            status=ModuleStatus.RUNNING,
            started_at=datetime.utcnow()
        )
        
        if not self.is_available():
            self.result.status = ModuleStatus.SKIPPED
            self.result.error_message = f"API key '{self.api_key_name}' not configured"
            return self.result
        
        if target.target_type not in self.supported_types:
            self.result.status = ModuleStatus.SKIPPED
            self.result.error_message = f"Target type '{target.target_type.value}' not supported"
            return self.result
        
        try:
            await self.rate_limiter.acquire()
            start_time = time.time()
            self.result = await self.run(target)
            self.result.execution_time = round(time.time() - start_time, 2)
            self.result.status = ModuleStatus.COMPLETED
            self.result.completed_at = datetime.utcnow()
        except Exception as e:
            self.result.status = ModuleStatus.FAILED
            self.result.error_message = str(e)
            self.result.completed_at = datetime.utcnow()
            logger.error(f"Module {self.name} failed: {e}")
        
        return self.result


class OSINTEngine:
    """Main OSINT Engine - Orchestrates all modules"""
    
    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.modules: Dict[str, BaseModule] = {}
        self.db = DatabaseManager(self.config.get("general", {}).get("database", "sqlite:///osint_nexus.db"))
        self.correlator = DataCorrelator()
        self.report_gen = ReportGenerator(self.config)
        self.investigation: Optional[Investigation] = None
        self._load_modules()
    
    def _load_config(self, path: str) -> dict:
        config_path = Path(path)
        if not config_path.exists():
            console.print(f"[red]Config file not found: {path}[/red]")
            return {}
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    
    def _load_modules(self):
        """Dynamically load all enabled modules"""
        module_registry = {
            # Domain modules
            "modules.domain.whois_lookup": "WhoisModule",
            "modules.domain.dns_enum": "DNSEnumModule",
            "modules.domain.subdomain_enum": "SubdomainModule",
            "modules.domain.ssl_cert": "SSLCertModule",
            "modules.domain.wayback": "WaybackModule",
            # Email modules
            "modules.email.hibp": "HIBPModule",
            "modules.email.hunter_io": "HunterModule",
            "modules.email.email_rep": "EmailRepModule",
            "modules.email.email_validator": "EmailValidatorModule",
            # IP modules
            "modules.ip.shodan_scan": "ShodanModule",
            "modules.ip.censys_scan": "CensysModule",
            "modules.ip.geoip": "GeoIPModule",
            "modules.ip.abuse_ipdb": "AbuseIPDBModule",
            "modules.ip.reverse_dns": "ReverseDNSModule",
            # Username modules
            "modules.username.sherlock_mod": "SherlockModule",
            "modules.username.whatsmyname": "WhatsMyNameModule",
            # Phone modules
            "modules.phone.phoneinfoga": "PhoneInfogaModule",
            "modules.phone.numverify": "NumverifyModule",
            # Threat Intel modules
            "modules.threat_intel.virustotal": "VirusTotalModule",
            "modules.threat_intel.otx_alienvault": "OTXModule",
            "modules.threat_intel.greynoise": "GreyNoiseModule",
            "modules.threat_intel.urlscan": "URLScanModule",
            # Web modules
            "modules.web.tech_detect": "TechDetectModule",
            "modules.web.google_dorking": "GoogleDorkModule",
            "modules.web.metadata_extract": "MetadataModule",
            "modules.web.crawler": "CrawlerModule",
            # Network modules
            "modules.network.port_scan": "PortScanModule",
            "modules.network.asn_lookup": "ASNModule",
            # Social media modules
            "modules.social_media.twitter_osint": "TwitterModule",
            "modules.social_media.instagram_osint": "InstagramModule",
            "modules.social_media.reddit_osint": "RedditModule",
            # Image modules
            "modules.image.exif_extract": "ExifModule",
        }
        
        for module_path, class_name in module_registry.items():
            try:
                mod = importlib.import_module(module_path)
                cls = getattr(mod, class_name)
                instance = cls(self.config)
                self.modules[instance.name] = instance
                logger.debug(f"Loaded module: {instance.name}")
            except (ImportError, AttributeError) as e:
                logger.warning(f"Could not load {module_path}: {e}")
        
        console.print(f"[green][+] Loaded {len(self.modules)} modules[/green]")
    
    def list_modules(self):
        """Display all available modules"""
        table = Table(title="🔌 Available Modules", show_header=True, header_style="bold cyan")
        table.add_column("Module", style="green")
        table.add_column("Category", style="yellow")
        table.add_column("Description")
        table.add_column("API Key", style="red")
        table.add_column("Status", style="bold")
        
        for name, module in sorted(self.modules.items()):
            status = "✅ Ready" if module.is_available() else "⚠️ No Key"
            api = module.api_key_name if module.requires_api_key else "None"
            table.add_row(name, module.category, module.description, api, status)
        
        console.print(table)
    
    async def investigate(
        self,
        target_value: str,
        target_type: TargetType,
        modules: Optional[List[str]] = None,
        categories: Optional[List[str]] = None
    ) -> Investigation:
        """
        Run a full investigation on a target
        """
        # Create investigation
        target = Target(value=target_value, target_type=target_type)
        self.investigation = Investigation(
            name=f"Investigation: {target_value}",
            targets=[target]
        )
        
        # Filter modules
        active_modules = self._filter_modules(target, modules, categories)
        
        if not active_modules:
            console.print("[red][-] No applicable modules found for this target type[/red]")
            return self.investigation
        
        console.print(Panel(
            f"[bold cyan]Starting Investigation[/bold cyan]\n\n"
            f"  Target: [green]{target_value}[/green]\n"
            f"  Type:   [yellow]{target_type.value}[/yellow]\n"
            f"  Modules: [magenta]{len(active_modules)}[/magenta]",
            title="OSINT Nexus",
            border_style="cyan"
        ))
        
        # Execute modules with progress tracking
        console.print("\n[cyan]Running OSINT modules...[/cyan]\n")
        
        # Run modules concurrently
        semaphore = asyncio.Semaphore(
            self.config.get("general", {}).get("max_threads", 10)
        )
        
        async def run_with_semaphore(module):
            async with semaphore:
                console.print(f"  [yellow]-> {module.name}[/yellow]")
                result = await module.execute(target)
                return module.name, result
        
        tasks = [run_with_semaphore(m) for m in active_modules]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Collect results
        for item in results:
            if isinstance(item, Exception):
                logger.error(f"Module error: {item}")
                continue
            module_name, result = item
            self.investigation.add_result(module_name, result)
        
        self.investigation.completed_at = datetime.utcnow()
        
        # Correlate data
        console.print("\n[cyan][*] Correlating data...[/cyan]")
        relationships = self.correlator.correlate(self.investigation)
        
        # Display summary
        self._display_summary()
        
        # Save to database
        self.db.save_investigation(self.investigation)
        
        return self.investigation
    
    def _filter_modules(
        self, 
        target: Target,
        module_names: Optional[List[str]] = None,
        categories: Optional[List[str]] = None
    ) -> List[BaseModule]:
        """Filter modules based on target type, names, and categories"""
        active = []
        for name, module in self.modules.items():
            # Check if module supports this target type
            if target.target_type not in module.supported_types:
                continue
            # Check specific module filter
            if module_names and name not in module_names:
                continue
            # Check category filter
            if categories and module.category not in categories:
                continue
            active.append(module)
        return active
    
    def _display_summary(self):
        """Display investigation summary"""
        if not self.investigation:
            return
        
        inv = self.investigation
        
        # Results table
        table = Table(title="\nInvestigation Results", show_header=True, header_style="bold green")
        table.add_column("Module", style="cyan")
        table.add_column("Status")
        table.add_column("Findings", justify="right")
        table.add_column("Time (s)", justify="right")
        table.add_column("Details")
        
        for name, result in inv.results.items():
            if result.status == ModuleStatus.COMPLETED:
                status = "[green]Done[/green]"
            elif result.status == ModuleStatus.FAILED:
                status = "[red]Failed[/red]"
            elif result.status == ModuleStatus.SKIPPED:
                status = "[yellow]Skipped[/yellow]"
            else:
                status = "[grey]Pending[/grey]"
            
            details = result.error_message[:50] if result.error_message else ""
            table.add_row(
                name, status, 
                str(result.finding_count), 
                str(result.execution_time),
                details
            )
        
        console.print(table)
        
        # Summary stats
        total = inv.total_findings
        completed = sum(1 for r in inv.results.values() if r.status == ModuleStatus.COMPLETED)
        failed = sum(1 for r in inv.results.values() if r.status == ModuleStatus.FAILED)
        
        console.print(f"\n[bold]Summary:[/bold]")
        console.print(f"  Total Findings: [bold green]{total}[/bold green]")
        console.print(f"  Modules Run:    [cyan]{completed}[/cyan]")
        console.print(f"  Modules Failed: [red]{failed}[/red]")
        console.print(f"  Duration:       [yellow]{(inv.completed_at - inv.started_at).total_seconds():.1f}s[/yellow]\n")
    
    def export_report(self, format: str = "json", output_path: str = None) -> str:
        """Export investigation results"""
        if not self.investigation:
            console.print("[red][-] No investigation to export[/red]")
            return ""
        return self.report_gen.generate(self.investigation, format, output_path)