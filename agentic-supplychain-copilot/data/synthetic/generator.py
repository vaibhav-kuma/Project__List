import random, json
skus = ['SKU-123','SKU-456','SKU-789']
for i in range(100):
    ev = {'sku': random.choice(skus), 'qty': random.randint(1,20)}
    print(json.dumps(ev))
