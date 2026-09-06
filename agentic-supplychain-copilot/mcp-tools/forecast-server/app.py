from flask import Flask, request, jsonify
app = Flask(__name__)
@app.route('/predict', methods=['POST'])
def predict():
    body = request.get_json() or {}
    sku = body.get('sku','SKU-123')
    return jsonify(sku=sku, forecast=100, lower=85, upper=120, anomaly=False)
if __name__=='__main__':
    app.run(host='0.0.0.0', port=8080)
