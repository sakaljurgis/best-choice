# BestChoice Comparator

BestChoice is a full-stack experiment for lining up similar products and comparing their properties side by side. The goal is to make it easy to track specs, notes, and supporting content gathered during product research. This entire codebase is a vibe-coded adventure—every single line was generated rather than typed by hand.

## Project Overview
- **Client**: React + Vite app for browsing projects, items, and attributes.
- **Server**: Express API that stores items, fetches URL summaries, and orchestrates LLM-assisted imports.
- **Shared**: Common TypeScript utilities and types used by both sides.
- **Database**: PostgreSQL (pgvector) instance defined in `docker-compose.yml`.

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- Docker (optional but recommended for the local Postgres instance)

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and provide real values as needed:
   ```bash
   cp .env.example .env
   ```
   The service expects values for the URL reader and LLM integrations. Leave them blank if you only want to explore the UI with mock data.
3. (Optional) Start the local PostgreSQL container:
   ```bash
   docker-compose up -d postgres
   ```

### Run in Development
```bash
npm run dev
```
This launches both the API (port `3000`) and the client (port `5173`) via concurrent processes.

### Build for Production
```bash
npm run build
```
Compiled assets land in `client/dist` and `server/dist`. Use `npm run lint` to check code style.

## Project Status
BestChoice is still evolving and unapologetically vibe-coded. Contributions are welcome, but expect a healthy dose of generative chaos.
