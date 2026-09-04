# 🛡️ AI-Powered Threat Detection & Response (EDR++)

An intelligent, real-time endpoint detection and response system that uses **Behavioral Analytics**, **LLMs**, and **GeoIP threat visualization** to detect and respond to cyber threats effectively.

---

## 🚀 Features

- 📂 Real-time log collection from endpoints
- ⚠️ Behavioral anomaly detection (UBA)
- 🧠 Auto-classification of threats using MITRE ATT&CK techniques
- 📘 LLM-generated response playbooks (OpenAI GPT-4)
- 🌍 Geo-map view of IP-based threats
- 🗨️ ChatOps-style interaction to query system status
- 📊 Streamlit dashboard for real-time insights

---

## 🏗️ Project Structure

edr_plus_ai/
├── main.py
├── log_collector.py
├── uba_module.py
├── mitre_mapper.py
├── llm_responder.py
├── chatops_interface.py
├── dashboard.py
├── utils/
│ ├── geoip_helper.py
├── data/
│ └── logs/
├── .env
├── geo_cache.pkl
├── requirements.txt
└── README.md


---

## 🔧 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/C1pt2r5/edr-plus-ai.git
cd edr-plus-ai

pip install -r requirements.txt

3. Add Your OpenAI API Key
Create a .env file in the root:

OPENAI_API_KEY=sk-your-api-key

4. Add GeoLite2-City Database
Download the GeoLite2-City.mmdb.

Place it in the project root (./GeoLite2-City.mmdb)

🧪 Run the System
Run CLI-based EDR engine:
    python main.py
Run Streamlit dashboard:
    streamlit run dashboard.py
📊 Dashboard Features
Real-time log count and anomaly display
MITRE ATT&CK threat classification
AI-generated incident response playbooks
Interactive IP-based geolocation map

🔐 Security Notes
API keys stored securely via .env
GeoIP queries cached in geo_cache.pkl
.env excluded from Git using .gitignore

📜 License
MIT License

👨‍💻 Author
Built with ❤️ by VAIBHAV KUMAR