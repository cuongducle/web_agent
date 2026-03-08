# Web Agent Playground

`web_agent` is a web agent playground for browser automation experiments with Next.js, FastAPI, and Chrome DevTools Protocol (CDP).

It is built for people who want to test how AI agents interact with real websites, compare different agent behaviors, and visualize browser-driven workflows in a cleaner interface than raw scripts alone.

This repository is especially relevant for searches such as:

- web agent playground
- browser automation with CDP
- Chrome DevTools Protocol agent
- Next.js FastAPI browser automation
- AI web agent demo
- browser agent UI

## What It Does

- run web agent experiments against a real browser
- connect agents through Chrome DevTools Protocol (CDP)
- visualize browser interactions in real time
- compare different AI providers and agent flows
- use a Next.js frontend with a FastAPI backend for agent orchestration

## Best For

- developers building browser automation tools
- teams experimenting with AI agents that act on websites
- people who want a demoable interface for CDP-driven workflows
- prototyping web agents before moving to production systems

## Tech Stack

- Next.js 15
- FastAPI
- Chrome DevTools Protocol (CDP)
- Shadcn UI
- Tailwind CSS
- Vercel AI SDK
- LangChain

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Google Chrome browser

### Installation

1. Clone the repository:

```bash
git clone https://github.com/cuongducle/web_agent.git
cd web_agent
```

2. Install frontend dependencies:

```bash
npm install
```

3. Install backend dependencies:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

4. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your CDP WebSocket endpoint and other required variables.

### Chrome DevTools Protocol Setup

Before running the application, you need to set up Chrome with CDP enabled. See [CDP_SETUP.md](CDP_SETUP.md) for detailed instructions.

In short:

1. Make sure your `.env.local` file contains:

```
CDP_WS_ENDPOINT=ws://localhost:9222
```

### Running Locally

Run the development server:

```bash
npm run dev
```

> ### Windows Users
> 
> If you're developing on Windows, you should use the Windows-specific command:
> 
> ```bash
> npm run dev:win
> ```
> 
> **Technical Reason:** Windows has two different asyncio event loop implementations:
> 
> - **SelectorEventLoop** (default): Uses select-based I/O and doesn't support subprocesses properly
> - **ProactorEventLoop**: Uses I/O completion ports and fully supports subprocesses
> 
> Playwright requires subprocess support to launch browsers. When hot reloading is enabled, the default SelectorEventLoop is used, causing a `NotImplementedError` when Playwright tries to create a subprocess.

This will start both the Next.js frontend (port 3001) and FastAPI backend (port 8000).

Visit [http://localhost:3001](http://localhost:3001) to start using web-surf-agent!

## Common Use Cases

- test a web agent against a local Chrome instance
- prototype browser automation flows with AI
- inspect how an agent clicks, navigates, and reacts to page state
- compare provider behavior in the same browser-driven task
- demo an agent UI built with Next.js and FastAPI

## Search Terms

People usually find this project through phrases such as:

- web agent
- web agent playground
- browser automation
- Chrome DevTools Protocol
- CDP browser automation
- AI browser agent
- Next.js FastAPI automation
- browser agent demo
- website automation agent

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Why This Repo Exists

Many web agent demos stop at raw scripts or terminal output. This project exists to make browser automation experiments more inspectable, demo-friendly, and easier to iterate on with a modern web UI.
