# PathFinder — YouTube Video Copy

For the Blackathon 2026 submission video. Pick one title, paste the description, add the chapter timestamps after editing the video.

---

## Title (pick one)

YouTube cuts off titles at ~60 characters on mobile. The first 50 characters carry most of the click.

### A) Problem-led, personal (recommended)

> **I Built an AI Career Tool for the Moment Black Workers Are Living Through**

54 chars before the "ing." Direct, first-person, names the audience. Strong hook for the Blackathon community feed.

### B) Numbers-led, technical

> **11 AI Agents Build Your Career Bridge in 60 Seconds | PathFinder**

64 chars. Punchy, technical, broader appeal beyond Blackathon. Works if the video gets shared in AI/builder communities.

### C) Hybrid (event + product)

> **PathFinder: Career Bridge Built by AI for Black Workers | Blackathon 2026**

72 chars. Mentions the event directly. Good for Blackathon submission archive but less punchy in the broader feed.

### D) Stakes-first, urgent

> **What Happens When DOGE and AI Hit the Same Households | PathFinder Demo**

71 chars. Highest tension, most polarizing. Could over-promise if the demo doesn't deliver on the framing.

**Recommendation: A.** Personal, problem-led, names the audience without leading with a politically-charged acronym. Strong hook that works on the Blackathon feed and beyond.

---

## Description (paste this)

```
Two displacements are converging on Black workers right now, in the same households at the same time.

One: federal employment, which built much of the Black middle class since the post-Great-Society civil-service reforms, is being cut. Black workers are 18% of the federal workforce. Black women specifically hold 14% of federal jobs against 6-7% of the general workforce.

Two: AI is automating customer-service, admin, and records jobs at the same time. Goldman Sachs, McKinsey, and Brookings each project 25-40% of those task families are automatable with current LLMs.

PathFinder is for that moment. Built for Blackathon 2026.

You paste your LinkedIn (or type two careers, if you know them). Eleven AI agents start working in parallel, in front of you. The first agent (Claude Opus 4.7) does a "skill diff" comparing what you can already do against what the target career demands, then maps the gap to a 12-module learning bridge. The other ten agents fan out to fill in the content: a narrative lesson grounded in your actual background, curated YouTube videos, recommended courses, the canonical books in the field, recent industry news from Perplexity Sonar with real citations, scholarly research from Google Scholar, and an "About this career" tab covering day-in-the-life, salary ladder, honest tradeoffs, and entry pathways.

About sixty seconds, end to end.

A few decisions on purpose:

Salary math is anchored on YOUR actual pay, not the median. Because of the racial wealth gap (~6x by Federal Reserve data), "follow your passion to a $30K cut" isn't a universal option for everyone.

The counselor (Claude Sonnet 4.6) is told explicitly to understand discrimination math, wealth math, and family-breadwinner math. No pep talks. If a transition is hard at 4 hours a week, it says nine months realistic, twelve honest. It also speaks back via ElevenLabs voice.

Anonymous-first. Free. Job-hunting from a shared family computer is a real constraint we built around.

🔗 LIVE DEMO
https://pathfinder-12w2tnc6d-tmoody1973s-projects.vercel.app

📦 SOURCE CODE
https://github.com/tmoody1973/pathfinder

📄 RESEARCH
The full positioning document with citations, including the data on Black federal employment, the wealth gap math, and the discrimination audit studies, is in the repo at /RESEARCH.md.

⏱ CHAPTERS
0:00 The moment
0:25 Meet the user
0:45 Discovery flow
1:15 The build (eleven agents working live)
1:55 The product
2:25 The counselor (voice)
2:45 Closing

🛠 BUILT WITH
Next.js 16, React 19, Tailwind, RetroUI for the brutalist aesthetic
Convex for realtime backend, file storage, and the streaming counselor
Anthropic Claude (Opus 4.7, Sonnet 4.6, Haiku 4.5)
Perplexity Sonar for live web data and salary citations
ElevenLabs for the counselor's voice
SerpAPI Google Scholar for academic grounding
O*NET 28.0 government occupation data
Clerk for anonymous-first authentication

📣 TAGGING THE COMMUNITIES THAT SHAPE THIS WORK
#Blackathon2026 #BlackInTech #BlackWomenInTech #BlackWPT #NSBE #Algorythm

If you run an HBCU career center, an Urban League chapter, a state workforce dev office serving displaced federal workers, or a federal outplacement firm: I want to talk. PathFinder costs roughly $0.50 to $1.50 per user and could fit into your workflow tomorrow.

A Black middle class that took six decades to build through federal employment cannot be allowed to fall in three. PathFinder is one specific friction point, removed.

Thanks for watching.

#AI #CareerChange #Blackathon #BlackTech #HBCU #UrbanLeague
```

---

## Notes on what to update before publishing

1. **Live demo URL**: the `pathfinder-12w2tnc6d` URL above is your current production deployment. New deployments get new slug-suffixed URLs. Before publishing, replace with the freshest deployment URL OR set up a stable Vercel alias.
2. **Chapter timestamps**: the chapters above match the VIDEO-SCRIPT.md scene timing, but adjust to your actual edit if the cuts came in differently.
3. **Final hashtag set**: hashtags at the very bottom (`#AI #CareerChange...`) help YouTube's algorithm. The mid-description hashtags (`#Blackathon2026 #BlackInTech...`) help with topic clustering. Keep both.

---

## YouTube SEO quick wins

- **Thumbnail**: a still from scene 4 (eleven agent tiles flipping yellow → green) is the strongest single frame. Use Tella's frame-capture or take a screenshot mid-recording.
- **Pinned comment**: paste the live demo URL as a pinned top comment after upload. Drives clicks.
- **First 2 lines of description**: only the first ~150 characters show before "...show more" on most clients. Make sure those are the strongest words. Currently: "Two displacements are converging on Black workers right now, in the same households at the same time." That's 100 chars. Strong.
- **Cards / End screens**: link to your GitHub and to the live demo. End screen at the last 5-10 seconds.

---

## If you want to A/B test titles later

YouTube Studio's "Test & Compare" feature lets you run two titles against each other for 14 days. Recommended pairs:

- A vs B: "I Built an AI Career Tool..." vs "11 AI Agents Build Your Career Bridge..."
- This tests stakes-led vs feature-led framing for THIS audience

Worth doing if the video gets traction post-Blackathon.

---

## Related copy

- LinkedIn announcement post: `LINKEDIN-POST.md`
- Submission narrative: `SUBMISSION.md`
- Demo script (what to record): `VIDEO-SCRIPT.md`
- Research positioning: `RESEARCH.md`
