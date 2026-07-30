# 🩺 Doctorji — AI Rural Health Triage

> Bridging the healthcare gap in rural India with AI-powered triage.

**Team Mitochondria** — GSoC 2026 Hackathon

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env and add your Supabase credentials
cp .env.example .env

# 3. Start dev server
npm run dev
```

## 📁 Project Structure

```
src/
├── main.jsx                  # Entry point
├── App.jsx                   # React Router setup
├── index.css                 # Design system & global styles
├── lib/
│   └── supabaseClient.js     # Supabase singleton
├── components/
│   ├── Navbar.jsx             # Top nav bar
│   └── ProtectedRoute.jsx     # Auth guard wrapper
└── pages/
    ├── Welcome.jsx            # Landing — Doctor / Patient choice
    ├── DoctorLogin.jsx        # Doctor sign-in
    ├── DoctorSignup.jsx       # Doctor registration (3 steps)
    ├── PatientLogin.jsx       # Patient sign-in
    ├── PatientSignup.jsx      # Patient registration (2 steps)
    ├── DoctorDashboard.jsx    # 🔒 Placeholder — Dashboard team
    ├── PatientDashboard.jsx   # 🔒 Placeholder — Dashboard team
    └── TriageChat.jsx         # 🔒 Placeholder — LLM team
```

## 👥 Team Ownership

| File(s) | Owner | Status |
|---|---|---|
| Welcome, Login, Signup pages | Auth team | ✅ Done |
| DoctorDashboard, PatientDashboard | Dashboard team | 🔲 Placeholder |
| TriageChat | LLM / AI team | 🔲 Placeholder |

## 🔐 Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Create `doctors` and `patients` tables matching the signup fields
3. Add your project URL and anon key to `.env`

## 🛠 Tech Stack

- **React** + **Vite** — fast dev server & build
- **React Router v6** — client-side routing
- **Supabase** — auth + database
- **Lucide React** — icons
- **Vanilla CSS** — custom design system (no Tailwind)

## 📄 License

MIT — built for GSoC 2026 hackathon.
