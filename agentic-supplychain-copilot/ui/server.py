from flask import Flask, send_file, jsonify
app = Flask(__name__, static_folder='.', static_url_path='')
@app.route('/')
def index():
    return send_file('index.html')
@app.route('/api/inject', methods=['POST'])
def inject():
    return 'Injected demand spike (UI demo)'
@app.route('/api/approve', methods=['POST'])
def approve():
    return 'Plan approved (UI demo)'
if __name__=='__main__':
    app.run(host='0.0.0.0', port=80)
