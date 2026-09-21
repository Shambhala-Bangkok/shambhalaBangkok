# Bangkok Shambhala Website

Modern, fast, community-focused website for [Bangkok Shambhala](https://shambhalabangkok.vercel.app) — a non-profit meditation community in the heart of Bangkok.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS v4 |
| Admin | Custom panel with email/password auth |
| Hosting | Vercel (shambhalabangkok.vercel.app) |
| Analytics | Plausible (privacy-first) |
| Email | Brevo (Sendinblue) |
| Automation | n8n |
| Translation | Google Translate (auto-detect) |
| Markdown | remark + remark-html |

## Key Features

- **Custom admin panel**: Email/password login at `/admin/` with Markdown editor, event & post CRUD via GitHub API
- **Markdown → HTML**: Content files processed at build time via `remark` + `remark-html`
- **Auto-translation**: Google Translate widget auto-detects browser language
- **Bangkok timezone**: All dates/times display in Asia/Bangkok (GMT+7)
- **SVG logo**: Custom brand logo served from `/public/images/logo.svg`
- **Static-first**: All pages pre-rendered at build time for maximum speed
- **Calendar integration**: ICS feed and per-event calendar downloads

## Quick Start

```bash
# Clone the repository
git clone https://github.com/br41s/shambhalaBangkok.git
cd shambhalaBangkok

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
shambala-bangkok/
├── automation/n8n/       # n8n workflow templates
├── content/
│   ├── blog/             # Blog posts (Markdown)
│   └── events/           # Events (Markdown)
├── docs/                 # Documentation
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── about/        # About pages
│   │   ├── admin/        # Custom admin panel (login, dashboard, CRUD)
│   │   ├── api/          # API routes (auth, content, newsletter, calendar)
│   │   ├── blog/         # Blog pages
│   │   ├── events/       # Event pages
│   │   └── ...           # Other routes
│   ├── components/
│   │   ├── admin/        # Admin forms (EventForm, PostForm, MarkdownEditor)
│   │   ├── layout/       # Header, Footer
│   │   └── ui/           # Reusable components
│   └── lib/              # Data layer, auth, utilities, types
└── package.json
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server on port 3000 |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm format` | Format code with Prettier |

## Content Management

Content is stored as Markdown files in the `content/` directory. Editors manage content through the custom admin panel.

### Using the Admin Panel

1. Go to `/admin/login` on the deployed site
2. Log in with your admin email and password
3. From the dashboard, create or edit events and blog posts
4. The admin panel commits changes to GitHub via API → Vercel rebuilds automatically

### Adding an Event

1. Go to `/admin/events/new`
2. Fill in title, dates, summary, pricing, modality, and the Markdown body
3. Click **Save Event** — it creates a Markdown file in `content/events/`

### Adding a Blog Post

1. Go to `/admin/posts/new`
2. Fill in title, author, tags, excerpt, and the Markdown body
3. Click **Save Post** — it creates a Markdown file in `content/blog/`

### Markdown File Format

Events and posts are stored as Markdown with YAML frontmatter:

```markdown
---
title: "Wednesday Evening Meditation"
slug: "wednesday-evening-meditation"
startDate: "2026-03-25T19:00:00+07:00"
endDate: "2026-03-25T20:30:00+07:00"
modality: "in-person"
pricing: "free"
status: "upcoming"
summary: "Weekly open meditation session."
---

Full description here in Markdown.
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

## Documentation

| Document | Description |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture & design decisions |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deployment guide (Vercel) |
| [EDITORIAL.md](docs/EDITORIAL.md) | Content editing guide for editors |
| [SECURITY.md](docs/SECURITY.md) | Security configuration & policies |
| [QA-CHECKLIST.md](docs/QA-CHECKLIST.md) | QA acceptance checklist |
| [MIGRATION.md](docs/MIGRATION.md) | URL migration from legacy site |
| [ROADMAP.md](docs/ROADMAP.md) | Feature roadmap (v1 → v2) |
| [MAINTENANCE.md](docs/MAINTENANCE.md) | Ongoing maintenance plan |

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Yes | Public URL of the site |
| `ADMIN_EMAIL` | Yes | Admin login email |
| `ADMIN_PASSWORD` | Yes | Admin login password |
| `ADMIN_SESSION_SECRET` | Yes | Random 32+ char string for session signing |
| `GITHUB_TOKEN` | Yes | GitHub PAT with repo contents read/write |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | No | Plausible analytics domain |
| `BREVO_API_KEY` | No | Brevo API for newsletters |
| `BREVO_LIST_ID` | No | Brevo contact list ID |
| `TURNSTILE_SITE_KEY` | No | Cloudflare Turnstile captcha (optional) |
| `TURNSTILE_SECRET_KEY` | No | Cloudflare Turnstile secret (optional) |

## License

This project is maintained by Bangkok Shambhala. All rights reserved.
