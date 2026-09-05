#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "${CYAN}"
cat << 'BANNER'
   ____  _____ ___ _   _ _____   _   _ _______  ___   _ ____  
  / _ \/ ___|_ _| \ | |_   _| | \ | | ____\ \/ / | | / ___| 
 | | | \___ \| ||  \| | | |   |  \| |  _|  \  /| | | \___ \ 
 | |_| |___) | || |\  | | |   | |\  | |___ /  \| |_| |___) |
  \___/|____/___|_| \_| |_|   |_| \_|_____/_/\_\\___/|____/ 
                                                                
BANNER
echo -e "${NC}"
echo -e "${BOLD}${GREEN}[*] OSINT NEXUS - Ultimate OSINT Framework Installer${NC}"
echo ""

# Check Python version
echo -e "${YELLOW}[+] Checking Python version...${NC}"
python3 --version || { echo -e "${RED}[-] Python3 not found!${NC}"; exit 1; }

# Create virtual environment
echo -e "${YELLOW}[+] Creating virtual environment...${NC}"
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install Python dependencies
echo -e "${YELLOW}[+] Installing Python dependencies...${NC}"
pip install -r requirements.txt

# Install external tools
echo -e "${YELLOW}[+] Installing external OSINT tools...${NC}"

# Sherlock
if ! command -v sherlock &> /dev/null; then
    echo -e "${CYAN}[+] Installing Sherlock...${NC}"
    pip install sherlock-project
fi

# theHarvester
if ! command -v theHarvester &> /dev/null; then
    echo -e "${CYAN}[+] Installing theHarvester...${NC}"
    pip install theHarvester
fi

# Amass
if ! command -v amass &> /dev/null; then
    echo -e "${CYAN}[+] Installing Amass...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo snap install amass 2>/dev/null || go install -v github.com/owasp-amass/amass/v4/...@master 2>/dev/null
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install amass
    fi
fi

# Subfinder
if ! command -v subfinder &> /dev/null; then
    echo -e "${CYAN}[+] Installing Subfinder...${NC}"
    go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest 2>/dev/null
fi

# Nmap
if ! command -v nmap &> /dev/null; then
    echo -e "${CYAN}[+] Installing Nmap...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get install -y nmap
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install nmap
    fi
fi

# PhoneInfoga
if ! command -v phoneinfoga &> /dev/null; then
    echo -e "${CYAN}[+] Installing PhoneInfoga...${NC}"
    curl -sSL https://raw.githubusercontent.com/sundowndev/phoneinfoga/master/support/scripts/install | bash
fi

# Tor
if ! command -v tor &> /dev/null; then
    echo -e "${CYAN}[+] Installing Tor...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get install -y tor
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install tor
    fi
fi

# ExifTool
if ! command -v exiftool &> /dev/null; then
    echo -e "${CYAN}[+] Installing ExifTool...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get install -y libimage-exiftool-perl
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install exiftool
    fi
fi

# GeoIP databases
echo -e "${YELLOW}[+] Downloading GeoIP databases...${NC}"
mkdir -p data/geoip
cd data/geoip
wget -q "https://git.io/GeoLite2-City.mmdb" -O GeoLite2-City.mmdb 2>/dev/null
wget -q "https://git.io/GeoLite2-ASN.mmdb" -O GeoLite2-ASN.mmdb 2>/dev/null
cd ../..

# Create config from template
if [ ! -f config.yaml ]; then
    cp config.yaml.example config.yaml
    echo -e "${YELLOW}[!] config.yaml created - Please add your API keys!${NC}"
fi

# Create reports directory
mkdir -p reports

# Initialize database
echo -e "${YELLOW}[+] Initializing database...${NC}"
python3 -c "from database.db_manager import DatabaseManager; DatabaseManager().init_db()"

echo ""
echo -e "${GREEN}${BOLD}[✓] OSINT NEXUS installed successfully!${NC}"
echo -e "${CYAN}[*] Run: python3 main.py --help${NC}"
echo -e "${YELLOW}[!] Don't forget to configure your API keys in config.yaml${NC}"