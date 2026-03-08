# Contributing to Web Surf Agent

Thanks for contributing.

## Ways to help

- Report bugs with reproducible steps
- Suggest new agent workflows or integrations
- Improve onboarding, docs, and examples
- Add tests around browser automation behavior
- Polish the UI for better demos and usability

## Local setup

```bash
git clone https://github.com/cuongducle/web_agent.git
cd web_agent
npm install
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.local.example .env.local
npm run dev
```

## Pull request guidelines

- Keep changes scoped and easy to review
- Update docs when behavior or setup changes
- Include screenshots for visible UI changes
- Prefer small PRs over large refactors
- Run lint before opening the PR

## Recommended workflow

```bash
git checkout -b codex/your-change
npm run lint
```

If your change affects the backend or agent plugins, include a short note about how you tested it.
