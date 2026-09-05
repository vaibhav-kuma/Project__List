"""
Web Dashboard for OSINT Nexus
"""
from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO
import asyncio
import json

from core.engine import OSINTEngine
from core.models import TargetType
from utils.validators import InputValidator


def create_app(config_path: str = "config.yaml"):
    app = Flask(__name__, template_folder="templates")
    app.config['SECRET_KEY'] = 'osint-nexus-secret'
    socketio = SocketIO(app)
    
    engine = OSINTEngine(config_path)
    
    @app.route('/')
    def index():
        return render_template('index.html')
    
    @app.route('/api/scan', methods=['POST'])
    def start_scan():
        data = request.json
        target = data.get('target', '')
        target_type = data.get('type', '')
        
        if not target:
            return jsonify({"error": "No target specified"}), 400
        
        if target_type:
            tt = TargetType(target_type)
        else:
            tt = InputValidator.detect_type(target)
        
        investigation = asyncio.run(
            engine.investigate(target, tt)
        )
        
        return jsonify(investigation.to_dict())
    
    @app.route('/api/modules')
    def list_modules():
        modules = []
        for name, module in engine.modules.items():
            modules.append({
                "name": name,
                "category": module.category,
                "description": module.description,
                "available": module.is_available(),
                "requires_api_key": module.requires_api_key,
            })
        return jsonify(modules)
    
    @app.route('/api/history')
    def history():
        investigations = engine.db.list_investigations()
        return jsonify(investigations)
    
    @app.route('/api/investigation/<inv_id>')
    def get_investigation(inv_id):
        inv = engine.db.get_investigation(inv_id)
        return jsonify(inv)
    
    @app.route('/api/search')
    def search():
        query = request.args.get('q', '')
        results = engine.db.search_findings(query)
        return jsonify(results)
    
    return app