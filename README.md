<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/pathfinder-logo-dark.svg">
  <img alt="PathFinder" src="public/pathfinder-logo.svg" width="600">
</picture>

### From where you are. To where you actually want to go.

Built for **Blackathon 2026**

</div>

---

## What it is

Career change is broken. Most career-change tools assume you already know your target. The other 90% of people, the ones who know they're stuck but don't know what to do next, are stuck on a Coursera search bar with no idea what to type.

PathFinder works for that 90%. Type two careers, or paste your LinkedIn, and watch eleven AI agents build your personalized 8-week learning bridge live, grounded in real O*NET government data, with honest salary math and a counselor that won't pep-talk you.

## Who it's for

- Tech workers laid off in the AI shake-out, planning the next decade
- Mid-career nurses, teachers, accountants asking "what now?"
- State workforce dev programs serving thousands of displaced workers
- Outplacement firms whose playbook predates AI
- Anyone who's read every "career change" Reddit thread and still doesn't know what to type into Coursera

## Impact

| Capability | Outcome |
|---|---|
| Eleven AI agents in parallel | Every learner gets a personalized 8-week bridge in under 60 seconds, grounded in real government data |
| Honest salary math | No "follow your passion" if it means a $30K cut. We surface the truth, including the cuts. |
| A counselor that won't pep-talk you | Treats career changers as the mid-career adults they are, not blank-slate beginners |
| Anonymous-first auth | Zero friction to try, one click to save your bridges across devices |
| Voice on the counselor | Browser speech-to-text + ElevenLabs replies, so learners talk while they walk |

## Three things most career tools refuse to do

**01. Live multi-agent build, in your browser.** Eleven AI agents in parallel. Skill diff on Opus 4.7. Lesson and resource agents on Haiku. Books, videos, courses each filtered by Claude for relevance. Salary live from Perplexity Sonar with real citations. You watch every step. No black box.

**02. Honest salary math, anchored on YOUR pay.** Most career sites tell you the median. We anchor on the salary you typed. If the target pays less, we say so, and show the dollar number. Cert payback periods in days, not months. Real O*NET government data, not vibes.

**03. A counselor that won't pep-talk you.** Sonnet 4.6 with your full path context. Direct. Calibrated. No "you got this!" energy. If your transition is hard at 4 hours/week, it says nine months realistic, twelve honest. Streams live, like ChatGPT, only it has actually read your résumé. And speaks back, with ElevenLabs voice.

## Built with

| | |
|---|---|
| **Frontend** | Next.js 16 / React 19 / Tailwind CSS / RetroUI (neo-brutalist) |
| **Backend** | Convex (realtime database + actions + file storage) |
| **AI models** | Anthropic Claude Opus 4.7 / Sonnet 4.6 / Haiku 4.5 |
| **Live web data** | Perplexity Sonar (search + chat completions) |
| **Voice** | Browser Web Speech API (STT) / ElevenLabs (TTS) |
| **Career data** | O*NET 28.0 government occupation database |
| **Auth** | Clerk (anonymous-first, one-click sign-in upgrade) |
| **Other** | Google Books / YouTube Data API / jsonrepair / react-markdown |

## What's next

- **Mobile-native experience** for read-anywhere learning
- **B2B distribution** for outplacement firms, state workforce dev programs, and college career centers
- **Bookmark + share** your bridges; see what worked for someone with your background
- **Premium 1:1 counselors** real human career counselors scheduled through the platform, with the AI-built bridge already in the room when they meet
- **Streaming TTS** for sub-second latency between counselor reply and audio playback

## Architecture at a glance

```
  ┌─────────────────────────────────────────────────────────────┐
  │ Next.js 16 (App Router) ── Convex realtime ── Clerk auth   │
  └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  Path generation pipeline (orchestrate.ts)                  │
  ├─────────────────────────────────────────────────────────────┤
  │  Phase 1 — Skill Diff (Opus 4.7)                            │
  │    • Two careers in, structured competency profiles + 12-   │
  │      module path outline out, on a consistent 0-100 scale   │
  │                                                             │
  │  Phase 2 — 9 content agents in parallel (Haiku 4.5 + Sonar) │
  │    • Lesson · Videos · Courses · Books · About · News       │
  │    • Salary · Community · Quiz/Project                      │
  │    • Each wrapped in a 30-60s timeout; failures degrade     │
  │      gracefully (tile shows "data unavailable")             │
  │                                                             │
  │  Phase 3 — Aggregate, persist, mark "done"                  │
  └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  Counselor (Sonnet 4.6, streaming + voice)                  │
  │    • Sees full path context: career, salary, hours, profile │
  │    • Streams tokens via Convex live query                   │
  │    • ElevenLabs TTS auto-plays in voice mode                │
  └─────────────────────────────────────────────────────────────┘
```

## Development

```bash
bun install
bun dev                     # Next.js on :3001
bunx convex dev             # Convex realtime backend
```

Required Convex environment variables (set with `bunx convex env set <KEY> <VALUE>`):

```
ANTHROPIC_API_KEY           # Claude Opus / Sonnet / Haiku
PERPLEXITY_API_KEY          # Sonar live web data
ELEVENLABS_API_KEY          # Counselor voice
ELEVENLABS_VOICE_ID         # Custom voice ID (optional, defaults to Adam)
CLERK_ISSUER_URL            # Clerk authentication issuer
CLERK_SECRET_KEY            # Clerk server-side
BLS_API_KEY                 # Bureau of Labor Statistics (optional, fallback ok)
YOUTUBE_API_KEY_1           # YouTube Data API (3-key rotation)
YOUTUBE_API_KEY_2
YOUTUBE_API_KEY_3
```

Required Next.js environment variables (in `.env.local`):

```
NEXT_PUBLIC_CONVEX_URL                # Convex deployment URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY     # Clerk publishable
```

## Closing

> If we get to scale, every laid-off worker has a personalized bridge to their next career within 60 seconds, grounded in government data, with an honest counselor for the questions the data can't answer.

That's the game.

---

<div align="center">

**Built for Blackathon 2026**

Reward clarity and usefulness, not just complexity.

</div>
