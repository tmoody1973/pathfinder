# PathFinder · Blackathon 2026 Submission

Career change for the moment Black workers are living through.

---

## Form-field copy (paste these directly)

### Tagline (under 100 chars)

> AI career-bridge tool for the moment after job loss, built for Black workers caught between federal workforce reductions and AI displacement.

### Short description (~300 chars · safe for any "summary" field)

> PathFinder is an AI career-bridge tool built for Black workers caught between federal workforce reductions and AI automation. Paste your LinkedIn or type two careers. Eleven AI agents build a personalized 8-week learning bridge in 60 seconds, with honest salary math and a counselor that won't pep-talk you.

### Live demo

https://pathfinder-12w2tnc6d-tmoody1973s-projects.vercel.app

### Source

https://github.com/tmoody1973/pathfinder

---

## Inspiration

Two displacements are converging on Black workers right now, in the same households, the same year.

The first is the federal workforce. Federal employment built much of the Black middle class since the post-Great-Society civil-service reforms of the 1960s and 70s. Black workers are about 18% of the federal workforce, against 13% of the overall labor force. Black women specifically hold around 14% of federal positions, against 6-7% of the general workforce. The 2025-2026 federal workforce reductions are disproportionately rolling back one of the few historically reliable middle-class pipelines this community has had access to.

The second is AI. The same population is, on a parallel track, watching their backup options get automated. Customer service. Records administration. Eligibility specialists. Claims processors. Goldman Sachs, McKinsey, and Brookings each project 25-40% of those task families are automatable with current LLM technology.

Existing career-change tools assume 6-12 months of financial runway, $10K bootcamp budgets, dense professional networks, and prestige credentials. With a roughly 6x racial wealth gap, those assumptions are not universal. So most career-change advice is technically correct and practically dangerous for the population that needs it most right now.

I built PathFinder for that gap.

## What it does

The user types their current career and target career. Or, if they don't know their target (which is the case for the 90% of career-change traffic that's exploration, not decision), they paste their LinkedIn and PathFinder suggests three careers with reasoning that cites specific phrases from their profile.

Once a target is picked, eleven AI agents start working in parallel, live, in front of the user. About 60 seconds end to end. The result is a personalized 8-week learning bridge with:

- A narrative lesson grounded in their actual background
- Curated YouTube videos, filtered by Claude for relevance to the target career
- Recommended courses with audit-vs-cert cost transparency
- The canonical books in the field, filtered by Claude (no DevOps books for a PM target)
- Recent industry news, fetched live from Perplexity Sonar with real citations
- Scholarly research papers via SerpAPI Google Scholar
- An "About this career" tab covering day-in-the-life, career ladder with comp ranges, honest tradeoffs, entry pathways, and adjacent careers
- A salary panel anchored on the user's actual pay, with honest deltas (including cuts)
- A 12-module path outline they can navigate
- A floating counselor (Claude Sonnet 4.6) that streams responses and speaks back via ElevenLabs voice

The counselor is told explicitly to understand discrimination math, wealth math, and family-breadwinner math. No pep talks. If a transition is hard at 4 hours a week, it says nine months realistic, twelve honest.

## How I built it

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS, RetroUI (neo-brutalist) |
| Backend | Convex (realtime database, actions, file storage) |
| Skill diff | Claude Opus 4.7 (one call generates both careers' competency profiles + the 12-module path outline on a consistent 0-100 scale) |
| Content agents | Claude Haiku 4.5 (lesson, videos, courses, books, community, About-this-career, assessment) |
| Counselor | Claude Sonnet 4.6 with streaming + structural awareness system prompt |
| Live web data | Perplexity Sonar (salary, news) with real source citations |
| Voice (TTS) | ElevenLabs API, fire-and-forget via Convex scheduler |
| Voice (STT) | Browser Web Speech API |
| Career data | O*NET 28.0 government occupation database |
| Auth | Clerk (anonymous-first, one-click sign-in upgrade) |
| Scholar | SerpAPI Google Scholar engine |
| Deploy | Vercel (frontend) + Convex (backend) |

The orchestration pattern is interesting in its own right. Phase 1 is the skill diff (Opus 4.7), which produces both the competency profile and the full 12-module pathOutline in a single call. Phase 2 fans out 9 content agents in parallel via `Promise.all`, each wrapped in a 30-60 second timeout. Failures degrade gracefully (a tile shows "data unavailable" but the rest of the module still renders). Phase 3 aggregates everything into a `modules` row in Convex. The UI subscribes to that row via live query, so every state change shows up in the user's browser within ~100ms.

## Real tradeoffs (what hackathons actually look like)

A few honest decisions made on the way:

- **Description agent: Sonnet → Haiku swap.** Original "About this career" agent ran on Claude Sonnet 4.6 for prose quality. It tipped over the 60s timeout under Anthropic load (Sonnet generates ~30-50 tokens/sec; this 1500-2500 token structured JSON is right at the edge). Switched to Haiku 4.5 mid-build. Quality drop on structured fact retrieval is small; quality drop on open-ended judgment would have been worse, which is why the counselor stayed on Sonnet.
- **Salary panel rendering bug.** Sonar sometimes returns a clean salary range ("$105K-$145K") but a broken/null median value. The UI was rendering "$0K national median" literally and computing fake -100% cuts. Found this on a Milwaukee Radio Host → Product Manager test path. Added a `parseRangeMidpoint()` helper as a defensive fallback so the panel computes a midpoint from the range when the median is missing or below a 10K sanity threshold.
- **Books agent relevance.** First version was returning DevOps books and generic management textbooks for Product Manager targets. The query-generation prompt was too loose ("agile delivery" matches DevOps content). Added an LLM relevance filter mirroring the existing Resource (videos) agent pattern, with a 60-point cutoff and citation-count tiebreaker. Books for PM now correctly surface Inspired (Cagan), Escaping the Build Trap, Continuous Discovery Habits.
- **Streaming counselor through Convex.** Convex doesn't have native server-sent events. To get the ChatGPT type-out feel, I insert an empty assistant message immediately, then stream Sonnet tokens and patch the message's `content` field every 250ms via `runMutation`. The live query pushes updates to the UI at the same cadence. Smooth enough.
- **Vercel deployment protection blocked the public URL.** Vercel's default for new projects is SSO-protected deployments. Disabled via `PATCH /v9/projects/{id} { ssoProtection: null }` against the API. Pushed.
- **Convex still on the dev deployment.** For real production traffic post-hackathon, would run `bunx convex deploy` to create a prod Convex deployment. For demo, the dev deployment is fine.

## What I'm proud of

- The multi-agent live pipeline as a visual experience. Eleven agent tiles flipping pending → yellow → green over 45-60 seconds is the demo wow that's hard to fake or replicate.
- The counselor's structural awareness. The system prompt explicitly addresses discrimination math, wealth math, family-breadwinner math, and the 2025-2026 federal-workforce context. Not as decoration; as actual product behavior. Verifiable by asking "I'm Black, primary breadwinner, 47, just laid off from federal. Is product management realistic for me?" and watching the response acknowledge transferable skills, breadwinner constraints, and calibrated timelines instead of pep-talking.
- The honest salary math. Anchored on the user's actual pay. Reports cuts in dollars, not just percentages. Shows cert payback periods in days. Refuses to "follow your passion" the user into a $30K cut without naming the cut.
- The brutalist landing page that doubles as the closing slide. The "How it works" / "Built with" / "Impact" / "Roadmap" sections embedded in the home page mean the demo recording can scroll back to the landing page for the closing instead of cutting to a separate deck.
- The Blackathon-aligned positioning document (`RESEARCH.md`). The product wasn't just built for "career changers"; it was built for a specific community in a specific moment. Naming that explicitly in the README and the SLIDES felt right.

## What I learned

- Convex's reactive query model is a better fit for streaming UI than I expected. I never had to write a single SSE handler, WebSocket reconnection logic, or stream-multiplexer. Inserting an empty row and patching it in a loop produced the exact UX I wanted.
- The cost ladder of multi-agent products matters more than the cost of any single call. Eleven agents per path at $0.50-$1.50 total is a fundamentally different unit-economics conversation than one $400/hour career counselor session. The 100-200x cost compression makes B2B distribution to outplacement firms, HBCU career centers, and state workforce dev offices viable in ways that didn't exist 18 months ago.
- The hardest part of the counselor wasn't the chat UI or the streaming. It was writing the system prompt that calibrates honesty without preaching. The structural-awareness section is six bullets totaling ~400 words, each phrased "apply when relevant; never lecture; never assume demographics." Sonnet 4.6 follows that calibration well. Haiku started leaning preachy in tests, which is part of why the counselor stayed on Sonnet.
- Naming the audience changes the product. Once I committed to writing for Renée (47, federal records administrator, Maryland, breadwinner), the design decisions that had felt arbitrary started feeling load-bearing. Anonymous-first because of shared family computers. Mobile-friendly because phone is primary device. Salary-anchored on user pay because the wealth gap makes "follow your passion" structurally dangerous. The persona is the spec.

## What's next

Past the hackathon, the roadmap shifts when the audience comes into focus:

- **HBCU career-center partnerships.** Howard, Spelman, Morehouse, Hampton, NCCU, FAMU, Tuskegee, Clark Atlanta. Roughly 50,000 graduating seniors a year served by systematically under-resourced career centers.
- **Urban League and NCBW chapter rollouts.** Both organizations run workforce-development programs and are looking for AI-era tooling that respects member constraints.
- **State workforce-development partnerships in states with high federal-worker concentrations.** Maryland, Virginia, DC, Georgia, Illinois have the highest concentrations of displaced federal workers and the public funding to serve them.
- **Federal outplacement contracts.** When workforce reductions trigger contractual outplacement obligations, the firms that hold those contracts need a delivery mechanism that doesn't cost $400/hour per career counselor.
- **Premium tier with culturally competent human counselors.** The hardest part of career advice for Black workers is finding counselors who understand the discrimination math, the wealth math, the family-breadwinner math, the code-switching math. Premium tier matches users with humans, scheduled through the platform, with the AI-built bridge already in the room before the meeting starts.
- **Streaming TTS on the counselor.** Right now the audio plays after Sonnet finishes streaming text. ElevenLabs has a streaming endpoint that would cut the perceived latency to near-zero.
- **Mobile-native app.** Push adoption further into communities that are mobile-first.

## Closing

PathFinder doesn't fix structural inequality. It doesn't reverse federal workforce policy, end hiring discrimination, or close the wealth gap.

What it does is take one specific friction point, the moment a person who just lost their job sits down and tries to figure out what comes next, and remove the barriers that exist there.

For Blackathon, that's the contribution. A working tool, built with honest math, that meets a community at the moment it's actually living through.

A Black middle class that took six decades to build through federal employment cannot be allowed to fall in three. Career change at scale, with honest math and zero gatekeeping, is a partial answer. Not the whole answer. But a partial answer is better than no answer, and it's a thing we can ship.

Shipped. Thanks.

---

## Built with

`Next.js 16` `React 19` `Tailwind CSS` `RetroUI` `Convex` `Anthropic Claude (Opus 4.7, Sonnet 4.6, Haiku 4.5)` `Perplexity Sonar` `ElevenLabs` `SerpAPI Google Scholar` `Web Speech API` `O*NET 28.0` `Clerk` `Google Books API` `YouTube Data API` `Vercel`

## Try it

- **Live demo**: https://pathfinder-12w2tnc6d-tmoody1973s-projects.vercel.app
- **Source**: https://github.com/tmoody1973/pathfinder
- **Demo profile to paste in the discovery flow**:

```
Senior Records Administrator at U.S. Department of Health and Human Services,
GS-9 step 7, 18 years of federal service. Managed compliance documentation
across HHS regional office. Stakeholder management with state agencies, audit
response, regulatory tracking. Cross-functional project lead on agency-wide
records modernization initiative. Hands-on with internal data systems and
regulatory reporting. Recently affected by 2025 federal workforce reductions.
```
