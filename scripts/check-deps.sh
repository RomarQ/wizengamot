#!/bin/bash
# Dependency checker for Wizengamot
# Returns: 0 = all good, 1 = missing required, 2 = missing optional only

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

MISSING_REQUIRED=0
MISSING_OPTIONAL=0

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Platform detection
detect_platform() {
    case "$(uname -s)" in
        Darwin*) echo "macos" ;;
        Linux*)  echo "linux" ;;
        *)       echo "unknown" ;;
    esac
}

PLATFORM=$(detect_platform)

# Check functions
check_command() {
    local cmd=$1
    local required=$2
    local install_macos=$3
    local install_linux=$4
    local note=$5

    if command -v "$cmd" &> /dev/null; then
        echo -e "  ${GREEN}[OK]${NC} $cmd"
        return 0
    else
        if [ "$required" = "required" ]; then
            echo -e "  ${RED}[MISSING]${NC} $cmd - REQUIRED"
            MISSING_REQUIRED=1
        else
            echo -e "  ${YELLOW}[MISSING]${NC} $cmd - optional"
            MISSING_OPTIONAL=1
        fi

        echo "       Install with:"
        if [ "$PLATFORM" = "macos" ]; then
            echo "         $install_macos"
        else
            echo "         $install_linux"
        fi

        if [ -n "$note" ]; then
            echo "       Note: $note"
        fi
        return 1
    fi
}

check_python_version() {
    if command -v python3 &> /dev/null; then
        local version=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
        local major=$(echo $version | cut -d. -f1)
        local minor=$(echo $version | cut -d. -f2)
        if [ "$major" -ge 3 ] && [ "$minor" -ge 10 ]; then
            echo -e "  ${GREEN}[OK]${NC} Python $version"
            return 0
        else
            echo -e "  ${RED}[MISSING]${NC} Python 3.10+ required (found $version)"
            MISSING_REQUIRED=1
            return 1
        fi
    else
        echo -e "  ${RED}[MISSING]${NC} Python 3.10+ required"
        echo "       Install from: https://www.python.org/downloads/"
        MISSING_REQUIRED=1
        return 1
    fi
}

check_node_version() {
    if command -v node &> /dev/null; then
        local version=$(node -v | sed 's/v//')
        local major=$(echo $version | cut -d. -f1)
        if [ "$major" -ge 18 ]; then
            echo -e "  ${GREEN}[OK]${NC} Node.js v$version"
            return 0
        else
            echo -e "  ${RED}[MISSING]${NC} Node.js 18+ required (found v$version)"
            MISSING_REQUIRED=1
            return 1
        fi
    else
        echo -e "  ${RED}[MISSING]${NC} Node.js 18+ required"
        echo "       Install from: https://nodejs.org/"
        MISSING_REQUIRED=1
        return 1
    fi
}

check_env_file() {
    if [ -f "$PROJECT_ROOT/.env" ]; then
        if grep -q "OPENROUTER_API_KEY=sk-or-v1-your-key-here" "$PROJECT_ROOT/.env" 2>/dev/null; then
            echo -e "  ${YELLOW}[WARNING]${NC} .env exists but API key is placeholder"
            echo "       Edit .env and add your OpenRouter API key"
            echo "       Get one at: https://openrouter.ai/"
            return 1
        elif grep -q "OPENROUTER_API_KEY=" "$PROJECT_ROOT/.env" 2>/dev/null; then
            local key_value=$(grep "OPENROUTER_API_KEY=" "$PROJECT_ROOT/.env" | cut -d'=' -f2)
            if [ -z "$key_value" ] || [ "$key_value" = "" ]; then
                echo -e "  ${YELLOW}[WARNING]${NC} OPENROUTER_API_KEY is empty"
                echo "       Edit .env and add your OpenRouter API key"
                return 1
            else
                echo -e "  ${GREEN}[OK]${NC} .env configured"
                return 0
            fi
        else
            echo -e "  ${YELLOW}[WARNING]${NC} OPENROUTER_API_KEY not found in .env"
            echo "       Add OPENROUTER_API_KEY=your-key to .env"
            return 1
        fi
    else
        echo -e "  ${YELLOW}[WARNING]${NC} .env file not found"
        echo "       Run: cp .env.example .env"
        echo "       Then edit .env and add your OpenRouter API key"
        return 1
    fi
}

check_dependencies_installed() {
    local has_issues=0

    # Check if uv has synced
    if [ -d "$PROJECT_ROOT/.venv" ]; then
        echo -e "  ${GREEN}[OK]${NC} Python virtual environment"
    else
        echo -e "  ${YELLOW}[WARNING]${NC} Python dependencies not installed"
        echo "       Run: uv sync"
        has_issues=1
    fi

    # Check if npm has installed
    if [ -d "$PROJECT_ROOT/frontend/node_modules" ]; then
        echo -e "  ${GREEN}[OK]${NC} Frontend dependencies"
    else
        echo -e "  ${YELLOW}[WARNING]${NC} Frontend dependencies not installed"
        echo "       Run: cd frontend && npm install"
        has_issues=1
    fi

    return $has_issues
}

# Main execution
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Wizengamot Dependency Check${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "Platform: $PLATFORM"
echo ""

echo -e "${BLUE}System Tools${NC}"
check_command "ffmpeg" "optional" "brew install ffmpeg" "sudo apt-get install ffmpeg" "Used by Synthesizer for YouTube & podcast audio extraction"
check_command "ffprobe" "optional" "brew install ffmpeg" "sudo apt-get install ffmpeg" "Used by yt-dlp (bundled with ffmpeg)"
echo ""

echo -e "${BLUE}Package Managers${NC}"
check_command "uv" "required" "curl -LsSf https://astral.sh/uv/install.sh | sh" "curl -LsSf https://astral.sh/uv/install.sh | sh"
check_command "npm" "required" "brew install node" "sudo apt-get install nodejs npm"
echo ""

echo -e "${BLUE}Runtime Versions${NC}"
check_python_version
check_node_version
echo ""

echo -e "${BLUE}Configuration${NC}"
check_env_file
echo ""

echo -e "${BLUE}Project Setup${NC}"
check_dependencies_installed
echo ""

# Summary
echo -e "${BLUE}============================================${NC}"
if [ $MISSING_REQUIRED -eq 1 ]; then
    echo -e "${RED}Some REQUIRED dependencies are missing.${NC}"
    echo "Please install them before running Wizengamot."
    echo ""
    exit 1
elif [ $MISSING_OPTIONAL -eq 1 ]; then
    echo -e "${YELLOW}ffmpeg is not installed.${NC}"
    echo ""
    echo "Without ffmpeg, these features will NOT work:"
    echo "  - Synthesizer: YouTube video transcription"
    echo "  - Synthesizer: Podcast episode transcription"
    echo ""
    echo "All other features (Council, Monitor, Visualiser, web articles) will work fine."
    echo ""

    # Check if running interactively
    if [ -t 0 ]; then
        read -p "Install ffmpeg now? [Y/n] " -n 1 -r
        echo ""

        if [[ $REPLY =~ ^[Nn]$ ]]; then
            echo ""
            echo -e "${YELLOW}Continuing without ffmpeg.${NC}"
            echo "YouTube and podcast transcription will be unavailable."
            echo ""
        else
            echo ""
            echo "Installing ffmpeg..."
            echo ""
            if [ "$PLATFORM" = "macos" ]; then
                if command -v brew &> /dev/null; then
                    brew install ffmpeg
                    if [ $? -eq 0 ]; then
                        echo ""
                        echo -e "${GREEN}ffmpeg installed successfully!${NC}"
                        MISSING_OPTIONAL=0
                    else
                        echo ""
                        echo -e "${RED}ffmpeg installation failed.${NC}"
                        echo "You can install it manually later with: brew install ffmpeg"
                        echo ""
                    fi
                else
                    echo -e "${RED}Homebrew not found.${NC}"
                    echo "Install Homebrew first: https://brew.sh"
                    echo "Then run: brew install ffmpeg"
                    echo ""
                    echo "Continuing without ffmpeg..."
                fi
            else
                echo "Running: sudo apt-get install -y ffmpeg"
                sudo apt-get install -y ffmpeg
                if [ $? -eq 0 ]; then
                    echo ""
                    echo -e "${GREEN}ffmpeg installed successfully!${NC}"
                    MISSING_OPTIONAL=0
                else
                    echo ""
                    echo -e "${RED}ffmpeg installation failed.${NC}"
                    echo "You can install it manually later with: sudo apt-get install ffmpeg"
                    echo ""
                fi
            fi
        fi
    else
        # Non-interactive mode (e.g., piped input), continue with warning
        echo "Running non-interactively. Continuing without ffmpeg."
        echo "To install later: brew install ffmpeg (macOS) or sudo apt-get install ffmpeg (Linux)"
        echo ""
    fi

    if [ $MISSING_OPTIONAL -eq 1 ]; then
        exit 2
    else
        exit 0
    fi
else
    echo -e "${GREEN}All dependencies satisfied!${NC}"
    echo ""
    exit 0
fi
