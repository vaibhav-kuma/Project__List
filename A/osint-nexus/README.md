# 🔱 OSINT Nexus

**The Ultimate OSINT Meta-Framework v2.0**

A comprehensive Open Source Intelligence (OSINT) gathering framework that aggregates 39+ OSINT modules into a unified platform with both CLI and Web interfaces.

## ✨ Features

- 🎯 **39+ OSINT Modules** across 10 categories
- 🌐 **Dual Interface** - CLI and Web Dashboard
- ⚡ **Async Execution** - Fast parallel module execution
- 🔗 **Data Correlation** - Automatic relationship discovery
- 📊 **Multiple Export Formats** - JSON, HTML, CSV, TXT, Markdown
- 🔒 **Rate Limiting** - Built-in API rate limit management
- 🕵️ **Tor Support** - Anonymous investigations
- 💾 **Persistent Storage** - SQLite database for history

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/osint-nexus.git
cd osint-nexus

# Run setup script
chmod +x setup.sh
./setup.sh

# Configure API keys
nano config.yaml

# Run investigation
python3 main.py scan example.com

# Launch web dashboard
python3 main.py dashboard
```

## 📦 Installation

### Requirements
- Python 3.8+
- pip
- Git

### Automated Setup
```bash
./setup.sh
```

### Manual Setup
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 🎮 Usage

### CLI Mode
```bash
# Basic scan
python3 main.py scan example.com

# Specify target type
python3 main.py scan user@example.com --type email

# Export to HTML
python3 main.py scan 1.2.3.4 --format html --output report.html

# Interactive mode
python3 main.py interactive

# List modules
python3 main.py modules
```

### Web Dashboard
```bash
python3 main.py dashboard
# Open http://localhost:5000
```

## 📋 Supported Target Types

- 🌐 **Domain** - example.com
- 🔢 **IP Address** - 1.2.3.4
- 📧 **Email** - user@example.com
- 👤 **Username** - johndoe
- 📱 **Phone** - +1234567890
- 🔗 **URL** - https://example.com
- #️⃣ **Hash** - MD5/SHA1/SHA256

## 🔌 OSINT Modules (39)

### Domain (5)
- WHOIS Lookup
- DNS Enumeration
- Subdomain Discovery
- SSL Certificate Analysis
- Wayback Machine

### Email (4)
- Have I Been Pwned
- Hunter.io
- EmailRep
- Email Validator

### IP (5)
- Shodan
- Censys
- GeoIP
- AbuseIPDB
- Reverse DNS

### Username (3)
- Sherlock (400+ sites)
- WhatsMyName
- Social Analyzer

### Phone (3)
- PhoneInfoga
- Numverify
- Carrier Lookup

### Threat Intel (4)
- VirusTotal
- AlienVault OTX
- GreyNoise
- URLScan.io

### Web (4)
- Technology Detection
- Google Dorking
- Metadata Extraction
- Web Crawler

### Network (3)
- Port Scanning
- Traceroute
- ASN Lookup

### Social Media (5)
- Twitter
- Instagram
- LinkedIn
- Reddit
- Facebook

### Image (3)
- EXIF Extraction
- Reverse Image Search
- Face Recognition

## ⚙️ Configuration

Edit `config.yaml`:

```yaml
api_keys:
  shodan: "YOUR_API_KEY"
  virustotal: "YOUR_API_KEY"
  hunter_io: "YOUR_API_KEY"
  # ... add your API keys
```

## 📊 Example Output

```
🔍 Starting Investigation
  Target: example.com
  Type:   domain
  Modules: 15

Running OSINT modules... ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100%

📊 Investigation Results
┏━━━━━━━━━━━━━━━┳━━━━━━━━━━┳━━━━━━━━━━┳━━━━━━━━━┓
┃ Module        ┃ Status   ┃ Findings ┃ Time    ┃
┡━━━━━━━━━━━━━━━╇━━━━━━━━━━╇━━━━━━━━━━╇━━━━━━━━━┩
│ whois         │ ✅ Done  │ 3        │ 1.2s    │
│ dns_enum      │ ✅ Done  │ 8        │ 2.1s    │
│ shodan        │ ✅ Done  │ 12       │ 3.4s    │
└───────────────┴──────────┴──────────┴─────────┘

📈 Summary
  Total Findings: 45
  Modules Run:    15
  Duration:       12.3s
```

## 🔐 API Keys

Required for full functionality:
- Shodan
- VirusTotal
- Hunter.io
- Have I Been Pwned
- Censys
- AbuseIPDB

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

## 📄 License

MIT License - see LICENSE file

## ⚠️ Disclaimer

This tool is for educational and authorized security testing only. Always obtain proper authorization before investigating targets.

## 🙏 Credits

Built with: Python, Flask, Rich, SQLAlchemy, and 39+ OSINT APIs

---

**Made with ❤️ for the OSINT community**
