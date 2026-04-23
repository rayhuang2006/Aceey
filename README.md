<p align="center">
  <img src="src-tauri/icons/icon.svg" width="120" />
</p>

# Aceey

<p align="center">
  A competitive programming IDE with built-in AI Agent
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-v2-blue?logo=tauri" alt="Tauri" />
  <img src="https://img.shields.io/badge/Rust-backend-orange?logo=rust" alt="Rust" />
  <img src="https://img.shields.io/badge/Monaco-Editor-blue?logo=visualstudiocode" alt="Monaco" />
  <img src="https://img.shields.io/badge/AI-Groq%20Llama%203.3-green" alt="AI" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License" />
</p>

---

Aceey combines a LeetCode-style coding interface with an AI agent that plans your contest preparation. Paste a problem, write your solution, compile and test — all in one window. When a contest approaches, the AI generates a personalized multi-day training plan using real CSES problems.

## Overview

Aceey is a desktop integrated development environment built specifically for competitive programming. It combines a LeetCode-style interface with AI-powered training planning and contest management. The application is built using Tauri v2 and integrates the Monaco Editor for a high-performance coding experience.

## Features

### IDE
- LeetCode-style split-pane layout (problem panel / code editor / test cases)
- Monaco Editor integration with C++ syntax highlighting and autocomplete
- Integrated C++ compile and run engine (g++, C++17)
- AC / WA / CE / RE / TLE verdict display for instant feedback
- Multiple test case support with automated output comparison
- Optimized workflows with Ctrl+Enter / Cmd+Enter keyboard shortcuts

### Contest Calendar
- Clist.by API integration (Codeforces, AtCoder, LeetCode, CodeChef)
- Monthly grid view with platform-colored event bars (CF/AT/LC/CC labels)
- Passive notifications alerting you of upcoming unplanned contests

### AI Training Agent
- "I want to compete" workflow: select contest, choose skill level, receive training plan
- Multi-day practice plans using real problems from the CSES Problem Set
- Clickable problem links directly to cses.fi for immediate practice
- Practice tasks displayed on the calendar with completion tracking
- Powered by Groq (Llama 3.3 70B free tier) for high-speed plan generation

## Screenshots

### IDE
<p align="center"><img src="docs/ide.png" width="800" /></p>

### Contest Calendar
<p align="center"><img src="docs/calendar.png" width="800" /></p>

### AI Training Plan
<p align="center"><img src="docs/training-plan.png" width="800" /></p>

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Tauri v2 (Rust backend + Web frontend) |
| Code Editor | Monaco Editor |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Contest Data | Clist.by API |
| AI Model | Groq - Llama 3.3 70B |
| Language Support | C++ (g++, C++17) |

## Getting Started

### Prerequisites

- Node.js (v18+)
- Rust toolchain (rustup)
- g++ compiler
- Groq API key (available at console.groq.com)
- Clist.by API key (available at clist.by)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/rayhuang2006/Aceey.git
   cd Aceey
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables by creating a `.env` file in the project root:
   ```
   CLIST_USERNAME=your_clist_username
   CLIST_API_KEY=your_clist_api_key
   GROQ_API_KEY=your_groq_api_key
   ```

### Running in Development

```bash
npm run tauri dev
```

## Roadmap

- [x] IDE skeleton with Monaco Editor
- [x] C++ compile and run engine
- [x] Contest calendar (Clist.by API)
- [x] AI training plan generator
- [x] Practice task calendar integration
- [ ] Debug Agent: AI-powered error analysis with Monaco Decorations API highlighting
- [ ] Guided Problem Solving Agent: Socratic-style step-by-step hints
- [ ] AtCoder problem auto-fetch
- [ ] Data persistence (save training plans across sessions)
- [ ] Multi-language support (Python, Java)
- [ ] Settings panel (compiler path, time limit, AI model selection)

## Architecture

- **Frontend (Web)**: Manages UI layout, Monaco Editor instances, calendar grid rendering, and user-agent interactions.
- **Backend (Rust/Tauri)**: Handles C++ compilation as a child process, manages execution environments, and performs secure API calls via system commands.
- **External Services**: Utilizes Clist.by for contest scheduling and Groq for high-speed AI inference.

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
