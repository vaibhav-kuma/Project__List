from flask import Flask, request, jsonify
import os, time
app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify(status='ok', ts=time.time())

@app.route('/inject', methods=['POST'])
def inject():
    data = request.get_json() or {}
    # In a real app: publish to NATS / PubSub
    return jsonify(received=data, msg='Injected event (demo)')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
