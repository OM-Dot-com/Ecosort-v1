[README (2).md](https://github.com/user-attachments/files/35540410/README.2.md)
# 🌱 EcoSort – AI-Powered Waste Management & Community Cleaning Platform

> **WeMakeDevs × Flagsmith Experimentation Hackathon 2026 · Track 01 – Test Something Real**
> We stopped guessing which AI scanner result helps people dispose of waste correctly, and started **testing it** with a real A/B experiment powered by **Flagsmith Experimentation**. → [Jump to the experiment](#-experimentation--ab-testing)

🔗 **Live app:** https://ecosort-v1.vercel.app/
🎥 **Demo video:** _add your video link here_

A full-stack Next.js application that helps people manage waste responsibly, learn recycling, organize community cleaning activities, collaborate with nearby people, and earn reward points for environmental contributions.

---

## 🧪 Experimentation / A/B Testing

### The question
When someone scans waste with EcoSort's AI scanner, does showing **disposal instructions right on the result card** help them actually dispose of it correctly, or is a simple result with a link to the guide enough?

### Hypothesis
> Showing disposal instructions directly with the AI scan result (**enhanced**) will increase the number of users who confirm correct disposal, compared to the **basic** result.

### Experiment design

| | Control — `basic` | Variant_1 — `enhanced` |
|---|---|---|
| Waste name, category, bin, recyclable | ✅ | ✅ |
| Inline disposal instructions | ❌ | ✅ (2–3 lines) |
| Disposal guide button | ✅ "View Disposal Guide →" | ✅ "View Full Disposal Guide →" |
| "I disposed of it correctly ✓" button | ✅ | ✅ |

### Flagsmith configuration

| Setting | Value |
|---------|-------|
| Experiment | EcoSort Scanner Experience |
| Feature flag | `scanner_experiment` (multivariate) |
| Control value | `"basic"` |
| Variation value | `"enhanced"` |
| Primary metric | `disposal_confirmed` (Occurrence, higher is better) |
| Traffic split | 50% / 50% |
| SDK | `@flagsmith/flagsmith` v12.6.0 (JavaScript) |

### Why `disposal_confirmed` and not "guide opened"?
The enhanced variant already shows instructions inline, so users may open the full guide *less* even when the experience is *better*. Measuring "guide opened" would unfairly penalise it. `disposal_confirmed` measures what we actually care about: **did the user dispose of the waste correctly?**

### How it works

```
User scans waste
  → flagsmith.identify(userId)                        // Supabase UUID or anonymous UUID
  → flagsmith.getExperimentFlag('scanner_experiment')  // gets variant AND records exposure
  → result card renders "basic" or "enhanced"
  → user clicks "I disposed of it correctly ✓"
  → flagsmith.trackEvent('disposal_confirmed')         // conversion
  → page hidden → flagsmith.flushEvents()              // no events lost
```

1. **Identity** — Logged-in users are identified by their Supabase UUID. Anonymous users get a persistent random UUID stored in `localStorage` (`ecosort_anon_id`). No PII (email, name) is ever sent to Flagsmith.
2. **Exposure** — `flagsmith.getExperimentFlag('scanner_experiment')` evaluates the flag **and** records the exposure in one call ([official docs](https://docs.flagsmith.com/experimentation/run-an-experiment)).
3. **Conversion** — Clicking "I disposed of it correctly ✓" fires `flagsmith.trackEvent('disposal_confirmed')` (once per scan result).
4. **Flushing** — A `visibilitychange` listener calls `flagsmith.flushEvents()` when the page is hidden, so events aren't lost on tab close or navigation.

### 📊 Results

> ⚠️ **All experiment traffic below is SIMULATED.** Identities are prefixed `sim-`, and **both variants were given the same 40% conversion probability.** Variant assignment came from Flagsmith, not from the script.

| Variant | Exposures | Conversion rate |
|---|---|---|
| Control (`basic`) | 108 | 41.7% |
| Variant_1 (`enhanced`) | 114 | 37.7% |

- Delta: −9.5%, 95% credible interval **[−39.0%, +20.1%]**
- Flagsmith shows Control leading with a **74%** chance to be best

**Interpretation:** both rates are close to the 40% used in the simulation, and the credible interval includes zero, so there is **no conclusive winner**. That is the correct result for identical simulated rates, and it proves the exposure → conversion pipeline works end to end. A real product decision needs real user traffic; the experiment keeps running for real users on the live app.

<!-- Drag your Flagsmith screenshots here:
![Experiment summary](docs/results-summary.png)
![Analysis table](docs/results-analysis.png)
![Exposures over time](docs/results-exposures.png)
-->

### 🐛 What we learned while debugging
The first 205 simulated identities were **enrolled** but recorded **no exposures**. We had been calling `getValue()` followed by `trackExposureEvent()` without the variant value, so Flagsmith couldn't attribute the exposure, and conversions without an exposure don't count. Following the [Flagsmith docs](https://docs.flagsmith.com/experimentation/run-an-experiment), we switched to `getExperimentFlag()`, which evaluates the flag and records the exposure in one call. Exposures and conversions appeared right away. That's why the dashboard shows 427 enrolled but 222 exposures.

### Key files

| File | Purpose |
|------|---------|
| `src/lib/flagsmith.ts` | Flagsmith client singleton, identity resolution, event flushing |
| `src/hooks/useScannerExperiment.ts` | React hook: returns variant + `trackDisposalConfirmed()` |
| `src/components/scanner/ScanResultCard.tsx` | A/B result card, renders both variants |
| `src/app/dashboard/scanner/page.tsx` | Scanner page, uses `ScanResultCard` |
| `scripts/simulate-traffic.mjs` | Simulated traffic script (hackathon demo only) |

### Setting up the experiment in Flagsmith

1. Create a multivariate feature flag `scanner_experiment`: control = `"basic"`, variation = `"enhanced"`
2. Create a metric `disposal_confirmed` (Occurrence, higher is better)
3. Create an experiment on `scanner_experiment` with `disposal_confirmed` as the primary metric and a 50/50 split
4. Launch the experiment

### Running the simulated traffic script

```bash
# Simulate 200 users (default)
node --env-file=.env.local scripts/simulate-traffic.mjs 200

# Simulate a custom number
node --env-file=.env.local scripts/simulate-traffic.mjs 50
```

> ⚠️ **ALL traffic from this script is simulated.** Every user has an identical 40% conversion probability regardless of variant. Any difference in rates is random chance, not a real treatment effect.

---

## 🌿 Features

### AI Waste Scanner
- Upload or capture waste images
- AI classification using Google Gemini Vision
- Identifies waste type, category, recommended bin, recyclability
- Confidence scoring with verification prompts
- Scan history tracking
- Points awarded per scan (daily limit: 10)
- **A/B tested result card via Flagsmith** (see above)

### Eco Community
- Create and join cleaning groups
- Public and private groups
- Group discussions and announcements
- Member management with join requests
- Environmental goal tracking

### Cleaning Drives
- Organize local cleanup events
- Event registration and attendance
- Before/after evidence submission
- Organizer verification system
- Points awarded for participation

### Points & Rewards
- Gamified contribution system
- Configurable point values (admin)
- Achievement badges
- Daily/weekly challenges
- Reward redemption
- Individual and group leaderboards

### Nearby Map
- Location-based discovery
- Distance-sorted events and groups
- Manual location selection
- City search and filtering

### Recycling Guides
- Educational content (articles, guides)
- Waste segregation, recycling, composting, e-waste
- Points for completed learning activities
- Daily learning limits

### Admin Dashboard
- User management with role controls
- Evidence review and approval
- Report moderation
- Point configuration management
- Platform statistics

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Next.js API Routes (Server-side) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | Google Gemini 3.5 Flash (Vision) |
| Experimentation | Flagsmith (@flagsmith/flagsmith v12.6.0) |
| Icons | Lucide React |
| Notifications | React Hot Toast |
| Deployment | Vercel |

---

## 📦 Installation

### Prerequisites
- Node.js 20.6+ and npm (20.6+ needed for `--env-file` in the simulation script)
- A Supabase project (free tier works)
- Google Gemini API key (for AI Scanner)
- Flagsmith account with Experimentation enabled
- Google Maps API key (optional, for interactive maps)

### 1. Clone & Install

```bash
git clone https://github.com/OM-Dot-com/Ecosort-v1.git
cd Ecosort-v1
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste the contents of `supabase/schema.sql`
3. Click **Run** to create all tables, RLS policies, and seed data
4. Go to **Authentication > Providers** and ensure Email provider is enabled
5. Go to **Settings > API** to find your credentials

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini AI (required for AI Scanner)
GEMINI_API_KEY=your-gemini-api-key

# Google Maps (optional - for interactive map view)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-api-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Flagsmith (A/B Experimentation)
NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_KEY=your-flagsmith-client-side-environment-key
```

#### Getting API Keys

**Supabase:**
- URL & Anon Key: Settings > API > Project URL & anon/public key
- Service Role Key: Settings > API > service_role key (keep secret!)

**Google Gemini API:**
- Go to [Google AI Studio](https://aistudio.google.com/apikey)
- Create an API key
- The app uses the `gemini-3.5-flash` model

**Google Maps (Optional):**
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Enable Maps JavaScript API and create an API key
- Without this, the Nearby Map page shows a list view instead

**Flagsmith (A/B Experimentation):**
- Sign up at [flagsmith.com](https://www.flagsmith.com)
- Open your project, select the **Development** environment, then **SDK Keys** → copy the **Client-side Environment Key**
- See [Experimentation](#-experimentation--ab-testing) above for the full setup

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Create First Admin User

1. Register a new account via the app
2. In Supabase SQL Editor, run:
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
```

---

## 🗄️ Database Schema

The database includes 20+ tables with full RLS policies:

- **profiles** – User profiles with points, stats, roles
- **groups** – Cleaning groups (public/private)
- **group_members** – Group membership
- **group_join_requests** – Private group join requests
- **group_messages** – Group discussions
- **cleaning_events** – Cleanup drive events
- **event_registrations** – Event signups
- **event_attendance** – Attendance records
- **cleanup_evidence** – Before/after evidence
- **waste_scans** – AI scan results
- **point_transactions** – Points ledger
- **rewards** / **reward_redemptions** – Rewards system
- **achievements** / **user_achievements** – Badges
- **notifications** – In-app notifications
- **learning_content** / **quiz_attempts** – Educational content
- **challenges** / **challenge_completions** – Daily/weekly challenges
- **reports** – Content reporting
- **point_config** – Admin-configurable point values

All tables have Row Level Security (RLS) enabled with proper policies.

---

## 🏗️ Project Structure

```
src/
├── app/
│   ├── api/              # Backend API routes
│   │   ├── admin/        # Admin operations
│   │   ├── events/       # Event registration, attendance, evidence
│   │   ├── groups/       # Group join, leave, messages, requests
│   │   ├── learn/        # Learning completion
│   │   ├── points/       # Points queries
│   │   ├── rewards/      # Reward redemption
│   │   └── scan/         # AI waste scanning
│   ├── auth/             # Auth pages (login, register, etc.)
│   ├── dashboard/        # Protected dashboard pages
│   │   ├── admin/        # Admin panel
│   │   ├── community/    # Groups & group detail
│   │   ├── drives/       # Events & event detail
│   │   ├── learn/        # Learning content
│   │   ├── leaderboard/  # Rankings
│   │   ├── map/          # Nearby activities
│   │   ├── notifications/# Notification center
│   │   ├── profile/      # User profile
│   │   ├── rewards/      # Rewards & challenges
│   │   └── scanner/      # AI waste scanner
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing page
├── components/
│   ├── layout/           # Sidebar, TopBar, MobileNav, DashboardLayout
│   ├── scanner/          # ScanResultCard (A/B experiment variants)
│   └── ui/               # Reusable components (Avatar, Badge, etc.)
├── hooks/                # Custom hooks (useAuth, useLocation, useScannerExperiment)
├── lib/
│   ├── supabase/         # Supabase client setup
│   ├── flagsmith.ts      # Flagsmith client singleton
│   ├── types.ts          # TypeScript interfaces
│   └── utils.ts          # Utility functions
└── middleware.ts         # Auth middleware
scripts/
└── simulate-traffic.mjs  # Simulated experiment traffic (labelled, sim- identities)
```

---

## 🔒 Security

- **Row Level Security (RLS)** on all Supabase tables
- **Server-side auth checks** in all API routes
- **Service role client** only used server-side for privileged operations
- **Points awarded server-side** only – cannot be manipulated from client
- **Duplicate prevention** for point awards using reference_id checks
- **Daily limits** on scans and learning activities
- **Admin role verification** on all admin API routes
- **Private group content** restricted to members only
- **No PII sent to Flagsmith** – only anonymous or Supabase UUIDs

---

## 🚀 Deployment (Vercel)

1. Push to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local` (including `NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_KEY`)
4. Deploy

---

## 📐 Point System

| Action | Points | Daily Limit |
|--------|--------|-------------|
| Waste Scan | 5 | 10/day |
| Participate in Cleanup | 50 | — |
| Complete Verified Drive | 100 | — |
| Organize Event | 150 | — |
| Upload Verified Evidence | 30 | — |
| Learning Activity | 10 | 5/day |
| Quiz Completion | 15 | 5/day |

All values are configurable by admins in the Admin > Settings panel.

---

## 🎨 Design

- **Primary:** Forest Green (#15803d)
- **Secondary:** Light Green (#22c55e)
- **Background:** Very Light Green (#f0fdf4)
- **Accent:** Lime Green (#a3e635)
- Rounded cards with soft shadows
- Responsive design (mobile-first)
- Bottom navigation on mobile, sidebar on desktop
- Smooth fade-in animations

---

## License

MIT
