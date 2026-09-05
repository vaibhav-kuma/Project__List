#!/usr/bin/env python3
"""
OSINT Nexus - Ultimate OSINT Meta-Framework
Main entry point with Rich CLI
"""
import asyncio
import sys
import click
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.table import Table

from core.engine import OSINTEngine
from core.models import TargetType
from utils.validators import InputValidator

console = Console()

@click.group()
@click.option('--config', '-c', default='config.yaml', help='Config file path')
@click.pass_context
def cli(ctx, config):
    """OSINT Nexus - Connect every OSINT tool in one framework"""
    ctx.ensure_object(dict)
    ctx.obj['config'] = config

@cli.command()
@click.argument('target')
@click.option('--type', '-t', 'target_type', 
              type=click.Choice(['domain', 'ip', 'email', 'username', 'phone', 'url', 'hash']),
              help='Target type (auto-detected if not specified)')
@click.option('--modules', '-m', multiple=True, help='Specific modules to run')
@click.option('--category', '-cat', multiple=True, help='Module categories to run')
@click.option('--output', '-o', default=None, help='Output file path')
@click.option('--format', '-f', 'fmt', default='html', 
              type=click.Choice(['json', 'html', 'csv', 'txt', 'md']),
              help='Report format')
@click.pass_context
def scan(ctx, target, target_type, modules, category, output, fmt):
    """Run OSINT investigation on a target"""
    console.print("[cyan bold]OSINT NEXUS - Starting Investigation[/cyan bold]\n")
    
    engine = OSINTEngine(ctx.obj['config'])
    
    if target_type:
        tt = TargetType(target_type)
    else:
        tt = InputValidator.detect_type(target)
        console.print(f"[yellow][*] Auto-detected target type: {tt.value}[/yellow]")
    
    if not InputValidator.validate_target(target, tt):
        console.print(f"[red][-] Invalid {tt.value}: {target}[/red]")
        sys.exit(1)
    
    investigation = asyncio.run(
        engine.investigate(
            target_value=target,
            target_type=tt,
            modules=list(modules) if modules else None,
            categories=list(category) if category else None,
        )
    )
    
    if investigation.total_findings > 0:
        report_path = engine.export_report(format=fmt, output_path=output)
        console.print(f"\n[green][+] Report saved: {report_path}[/green]")

@cli.command()
@click.pass_context
def modules(ctx):
    """List all available OSINT modules"""
    console.print("[cyan bold]OSINT NEXUS - Available Modules[/cyan bold]\n")
    engine = OSINTEngine(ctx.obj['config'])
    engine.list_modules()

@cli.command()
@click.pass_context
def dashboard(ctx):
    """Launch web dashboard"""
    console.print("[cyan bold]OSINT NEXUS - Web Dashboard[/cyan bold]\n")
    console.print("[cyan][*] Starting web dashboard on http://localhost:5000[/cyan]")
    
    try:
        from ui.dashboard import create_app
        app = create_app(ctx.obj['config'])
        app.run(host='0.0.0.0', port=5000, debug=True)
    except ImportError:
        console.print("[red][-] Flask not installed. Run: pip install flask flask-socketio[/red]")

if __name__ == "__main__":
    cli(obj={})
