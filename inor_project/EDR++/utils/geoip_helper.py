import geoip2.database
import os
import pickle

# Load database
READER = geoip2.database.Reader("GeoLite2-City.mmdb")

# Path to cache file
CACHE_FILE = "geo_cache.pkl"

# Load cache if exists
if os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, "rb") as f:
        cache = pickle.load(f)
else:
    cache = {}

def get_location(ip):
    if ip in cache:
        return cache[ip]
    
    try:
        response = READER.city(ip)
        loc = {
            "ip": ip,
            "city": response.city.name,
            "country": response.country.name,
            "lat": response.location.latitude,
            "lon": response.location.longitude
        }
        cache[ip] = loc
        # Save updated cache
        with open(CACHE_FILE, "wb") as f:
            pickle.dump(cache, f)
        return loc
    except:
        return None
