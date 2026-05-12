# IncuBase — The Operating System for Innovation Ecosystems

A comprehensive SaaS platform for digitizing and streamlining operations of government and university-led incubation centers. Manages the entire incubation lifecycle from startup applications through program completion.

## Features

### Core Modules

| Module | Description |
|--------|-------------|
| **Program Management** | Create cohorts with custom timelines, evaluation criteria, and application forms |
| **Application & Evaluation** | Multi-round selection with weighted scorecards and blind judging |
| **Startup Lifecycle** | Track milestones, mentorship sessions, and progress per startup |
| **Facility Management** | Visual floor-plan with seats, cabins, meeting rooms — real-time availability |
| **Analytics** | Occupancy trends, booking heatmaps, peak hours, and capacity forecasting |
| **Reports** | Executive summaries, application funnels, facility utilization, milestone progress |
| **Compliance** | Immutable audit trail, RBAC management, security oversight |

### AI Agents (Gemini-powered)

All AI features follow a **human-in-the-loop** design — recommendations only, never auto-actions.

| Agent | Purpose |
|-------|---------|
| **Application Summarizer** | Generates structured summaries for faster reviewer screening |
| **Pre-screener & Shortlister** | Scores applications against weighted criteria with preliminary rankings |
| **Mentor-Startup Matcher** | Suggests optimal pairings based on skills, sector, and availability |
| **Facility Predictor** | Forecasts demand, identifies peak patterns, recommends capacity adjustments |
| **Progress Insights** | Flags startups as excelling/on-track/at-risk with actionable recommendations |

### Security

- **Multi-tenant isolation** — Row Level Security (RLS) on every table
- **Role-Based Access Control** — 5 roles: Admin, Facility Manager, Reviewer, Mentor, Startup
- **Audit logging** — Every action recorded with user, timestamp, and metadata
- **Rate limiting** — API-level protection with exponential backoff on AI calls

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4, Zustand, Motion |
| Backend | Node.js, Express 4, TypeScript, Modular Monolith |
| Database | Supabase (PostgreSQL) with RLS policies |
| AI | Google Gemini 2.0 Flash via `@google/genai` SDK |
| Auth | Supabase Auth (JWT-based) |

## Project Structure

```
incubase/
├── src/                          # React frontend
│   ├── pages/
│   │   ├── landing/              # Public landing page
│   │   ├── auth/                 # Login & signup
│   │   ├── dashboard/            # Main dashboard
│   │   ├── programs/             # Program management
│   │   ├── applications/         # Application review
│   │   ├── lifecycle/            # Startup milestones & mentorship
│   │   ├── facilities/           # Floor-plan visualization
│   │   ├── analytics/            # Utilization charts & trends
│   │   ├── ai/                   # AI Insights dashboard
│   │   ├── reports/              # Report generation
│   │   ├── compliance/           # Audit logs & RBAC
│   │   └── settings/             # Profile & preferences
│   ├── layouts/                  # Dashboard shell
│   ├── components/               # Reusable UI components
│   └── lib/                      # Supabase client, Zustand stores, utilities
├── server/                       # Express backend
│   ├── agents/                   # 5 AI agent implementations
│   │   ├── core.ts              # Gemini client with retry logic
│   │   ├── summarizer.ts        # Application summarization
│   │   ├── prescreener.ts       # Pre-screening & shortlisting
│   │   ├── mentorMatcher.ts     # Mentor-startup matching
│   │   ├── facilityPredictor.ts # Facility usage forecasting
│   │   └── progressInsights.ts  # Progress analysis
│   ├── modules/                  # Feature modules (routes + logic)
│   │   ├── programs/
│   │   ├── applications/
│   │   ├── lifecycle/
│   │   ├── facilities/
│   │   ├── analytics/
│   │   ├── ai/
│   │   ├── reports/
│   │   └── compliance/
│   ├── middleware/               # Auth, tenant isolation, rate limiting
│   └── db/                       # Schema, client, seed scripts
└── documentation.txt             # Full Detailed Project Report (DPR)
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)

### Setup

```bash
# Clone the repository
git clone https://github.com/Quant-Coders/Incubation-Management-Platfrom.git
cd Incubation-Management-Platfrom/incubase

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase and Gemini credentials

# Set up the database
# Run the SQL in server/db/schema.sql in your Supabase SQL editor

# Start development
npm run dev          # Frontend on http://localhost:3000
npm run dev:server   # Backend on http://localhost:3001
```

### Database Setup

1. Go to your Supabase project's SQL Editor
2. Run the contents of `server/db/schema.sql` to create all 14 tables with RLS policies
3. Optionally run `npx tsx server/db/seed.ts` to populate demo data

## API Endpoints

All protected routes require `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/programs` | List programs |
| POST | `/api/programs` | Create program (admin) |
| GET | `/api/applications` | List applications |
| POST | `/api/applications` | Submit application (startup) |
| POST | `/api/ai/summarize/:id` | AI summarize application |
| POST | `/api/ai/prescreen/:id` | AI pre-screen application |
| POST | `/api/ai/shortlist/:programId` | AI batch shortlist |
| POST | `/api/ai/mentor-match/:startupId` | AI mentor matching |
| POST | `/api/ai/facility-predict` | AI facility forecasting |
| POST | `/api/ai/progress/:startupId` | AI progress analysis |
| GET | `/api/lifecycle/milestones/:startupId` | Get milestones |
| POST | `/api/lifecycle/milestones` | Create milestone |
| GET | `/api/analytics/occupancy` | Occupancy metrics |
| GET | `/api/analytics/booking-trends` | Booking trends |
| GET | `/api/reports/executive-summary` | Executive report |
| GET | `/api/compliance/audit-logs` | Audit trail |

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full access to all modules, AI agents, reports, user management |
| **Facility Manager** | Facility management, analytics, space allocation |
| **Reviewer** | Application review, AI summarization, pre-screening |
| **Mentor** | Startup lifecycle, mentorship logging, progress insights |
| **Startup** | Own applications, milestones, session history |

## Architecture Decisions

- **Modular Monolith** — Clear module boundaries without microservice overhead
- **Multi-tenant by default** — Every table includes `tenant_id` with RLS enforcement
- **AI human-in-the-loop** — All AI outputs are recommendations requiring human approval
- **Retry with backoff** — AI calls retry 3x with exponential delay on rate limits
- **Audit everything** — AI actions, role changes, and sensitive operations are logged

## License

Apache-2.0
