from flask import Flask, request, jsonify
app = Flask(__name__)
@app.route('/stock', methods=['GET'])
def stock():
    sku = request.args.get('sku','SKU-123')
    return jsonify(sku=sku, qty=180, days_of_cover=0.4)
if __name__=='__main__':
    app.run(host='0.0.0.0', port=8080)
