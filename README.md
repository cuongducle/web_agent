# web-surf-agent

A playground for testing web agents powered by Chrome DevTools Protocol (CDP). Experience how different AI agents can surf and interact with the web just like humans do.

## 🌟 Features

- Test multiple web agents in a controlled environment
- Real-time browser interaction visualization
- Support for various AI providers (Claude, GPT-4, etc.)
- Built with modern web technologies (Next.js 15, FastAPI)
- Beautiful UI powered by Shadcn UI and Tailwind CSS
- Direct Chrome DevTools Protocol (CDP) integration for browser control

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Google Chrome browser

### Installation

1. Clone the repository:


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

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💪 Built With

- [Next.js 15](https://nextjs.org/) - React Framework
- [FastAPI](https://fastapi.tiangolo.com/) - Python Backend
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) - Browser Automation
- [Shadcn UI](https://ui.shadcn.com/) - UI Components
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Vercel AI SDK](https://sdk.vercel.ai/) - AI Chat Interface
- [Langchain](https://python.langchain.com/docs/introduction/) - Agent Framework
