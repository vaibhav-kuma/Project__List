"""
Report Generator - Export to multiple formats
"""
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

from jinja2 import Template
from core.models import Investigation, Severity
from utils.logger import setup_logger

logger = setup_logger(__name__)


class ReportGenerator:
    """Generate reports in multiple formats"""
    
    def __init__(self, config: dict):
        self.config = config
        self.output_dir = Path(config.get("general", {}).get("output_dir", "./reports"))
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate(
        self, 
        investigation: Investigation, 
        format: str = "json",
        output_path: Optional[str] = None
    ) -> str:
        """Generate report in specified format"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        target = investigation.targets[0].value if investigation.targets else "unknown"
        # Sanitize filename - remove invalid characters
        safe_target = target.replace(".", "_").replace("@", "_at_").replace(":", "_").replace("/", "_").replace("\\", "_")
        safe_target = safe_target[:50]  # Limit length
        
        if not output_path:
            output_path = str(self.output_dir / f"report_{safe_target}_{timestamp}.{format}")
        
        generators = {
            "json": self._generate_json,
            "html": self._generate_html,
            "csv": self._generate_csv,
            "txt": self._generate_text,
            "md": self._generate_markdown,
        }
        
        generator = generators.get(format, self._generate_json)
        generator(investigation, output_path)
        
        logger.info(f"Report saved to: {output_path}")
        return output_path
    
    def _generate_json(self, inv: Investigation, path: str):
        with open(path, 'w') as f:
            f.write(inv.to_json(indent=2))
    
    def _generate_html(self, inv: Investigation, path: str):
        template = Template("""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>OSINT Nexus Report - {{ target }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 30px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #0f3460; }
        .header h1 { color: #00d2ff; font-size: 2em; }
        .header .meta { color: #888; margin-top: 10px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
        .stat-card { background: #1a1a2e; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #333; }
        .stat-card .number { font-size: 2.5em; font-weight: bold; color: #00d2ff; }
        .stat-card .label { color: #888; margin-top: 5px; }
        .module-section { background: #1a1a2e; margin-bottom: 15px; border-radius: 8px; border: 1px solid #333; overflow: hidden; }
        .module-header { padding: 15px 20px; background: #16213e; cursor: pointer; display: flex; justify-content: space-between; }
        .module-header h3 { color: #00d2ff; }
        .module-body { padding: 20px; }
        .finding { padding: 15px; margin-bottom: 10px; border-radius: 6px; border-left: 4px solid #333; background: #111; }
        .finding.critical { border-left-color: #ff1744; }
        .finding.high { border-left-color: #ff9100; }
        .finding.medium { border-left-color: #ffea00; }
        .finding.low { border-left-color: #00e5ff; }
        .finding.info { border-left-color: #69f0ae; }
        .finding h4 { margin-bottom: 5px; }
        .finding .desc { color: #888; font-size: 0.9em; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75em; margin: 2px; }
        .badge.critical { background: rgba(255,23,68,0.2); color: #ff1744; }
        .badge.high { background: rgba(255,145,0,0.2); color: #ff9100; }
        .badge.medium { background: rgba(255,234,0,0.2); color: #ffea00; }
        .badge.low { background: rgba(0,229,255,0.2); color: #00e5ff; }
        .badge.info { background: rgba(105,240,174,0.2); color: #69f0ae; }
        pre { background: #0a0a0a; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.85em; }
        .tag { display: inline-block; background: #16213e; color: #00d2ff; padding: 2px 8px; border-radius: 4px; margin: 2px; font-size: 0.8em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔱 OSINT Nexus Report</h1>
            <div class="meta">
                <p>Target: <strong>{{ target }}</strong> | Type: {{ target_type }}</p>
                <p>Generated: {{ timestamp }} | Duration: {{ duration }}s</p>
                <p>Investigation ID: {{ inv_id }}</p>
            </div>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="number">{{ total_findings }}</div>
                <div class="label">Total Findings</div>
            </div>
            <div class="stat-card">
                <div class="number">{{ critical_count }}</div>
                <div class="label">Critical</div>
            </div>
            <div class="stat-card">
                <div class="number">{{ high_count }}</div>
                <div class="label">High</div>
            </div>
            <div class="stat-card">
                <div class="number">{{ modules_run }}</div>
                <div class="label">Modules Run</div>
            </div>
        </div>
        
        {% for module_name, module_result in results.items() %}
        <div class="module-section">
            <div class="module-header">
                <h3>{{ module_name }}</h3>
                <span>{{ module_result.finding_count }} findings | {{ module_result.execution_time }}s</span>
            </div>
            <div class="module-body">
                {% for finding in module_result.findings %}
                <div class="finding {{ finding.severity.value }}">
                    <h4>
                        <span class="badge {{ finding.severity.value }}">{{ finding.severity.value|upper }}</span>
                        {{ finding.title }}
                    </h4>
                    <p class="desc">{{ finding.description }}</p>
                    {% if finding.tags %}
                    <div>{% for tag in finding.tags %}<span class="tag">{{ tag }}</span>{% endfor %}</div>
                    {% endif %}
                    {% if finding.data %}
                    <details style="margin-top:8px">
                        <summary style="cursor:pointer;color:#00d2ff">View Data</summary>
                        <pre>{{ finding.data | tojson(indent=2) }}</pre>
                    </details>
                    {% endif %}
                </div>
                {% endfor %}
            </div>
        </div>
        {% endfor %}
    </div>
</body>
</html>
        """)
        
        all_findings = inv.all_findings
        
        html = template.render(
            target=inv.targets[0].value if inv.targets else "Unknown",
            target_type=inv.targets[0].target_type.value if inv.targets else "Unknown",
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            duration=(inv.completed_at - inv.started_at).total_seconds() if inv.completed_at else 0,
            inv_id=inv.id,
            total_findings=inv.total_findings,
            critical_count=sum(1 for f in all_findings if f.severity == Severity.CRITICAL),
            high_count=sum(1 for f in all_findings if f.severity == Severity.HIGH),
            modules_run=len(inv.results),
            results=inv.results,
        )
        
        with open(path, 'w') as f:
            f.write(html)
    
    def _generate_markdown(self, inv: Investigation, path: str):
        lines = [
            f"# 🔱 OSINT Nexus Report",
            f"",
            f"**Target:** {inv.targets[0].value if inv.targets else 'Unknown'}",
            f"**Type:** {inv.targets[0].target_type.value if inv.targets else 'Unknown'}",
            f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"**Total Findings:** {inv.total_findings}",
            f"",
            f"---",
            f"",
        ]
        
        for module_name, result in inv.results.items():
            lines.append(f"## {module_name}")
            lines.append(f"*Findings: {result.finding_count} | Time: {result.execution_time}s*")
            lines.append("")
            
            for finding in result.findings:
                severity_icon = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🔵", "info": "🟢"}
                icon = severity_icon.get(finding.severity.value, "⚪")
                
                lines.append(f"### {icon} {finding.title}")
                lines.append(f"{finding.description}")
                if finding.tags:
                    lines.append(f"*Tags: {', '.join(finding.tags)}*")
                if finding.data:
                    lines.append(f"```json\n{json.dumps(finding.data, indent=2, default=str)}\n```")
                lines.append("")
        
        with open(path, 'w') as f:
            f.write('\n'.join(lines))
    
    def _generate_csv(self, inv: Investigation, path: str):
        import csv
        with open(path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                "Module", "Category", "Severity", "Title", 
                "Description", "Confidence", "Tags", "Data"
            ])
            for result in inv.results.values():
                for finding in result.findings:
                    writer.writerow([
                        finding.module,
                        finding.category,
                        finding.severity.value,
                        finding.title,
                        finding.description,
                        finding.confidence,
                        "|".join(finding.tags),
                        json.dumps(finding.data, default=str)
                    ])
    
    def _generate_text(self, inv: Investigation, path: str):
        lines = [
            "=" * 70,
            "OSINT NEXUS REPORT",
            "=" * 70,
            f"Target: {inv.targets[0].value if inv.targets else 'Unknown'}",
            f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Findings: {inv.total_findings}",
            "=" * 70,
            "",
        ]
        
        for module_name, result in inv.results.items():
            lines.append(f"\n{'─' * 50}")
            lines.append(f"MODULE: {module_name} ({result.finding_count} findings)")
            lines.append(f"{'─' * 50}")
            
            for finding in result.findings:
                lines.append(f"\n  [{finding.severity.value.upper()}] {finding.title}")
                lines.append(f"  {finding.description}")
        
        with open(path, 'w') as f:
            f.write('\n'.join(lines))