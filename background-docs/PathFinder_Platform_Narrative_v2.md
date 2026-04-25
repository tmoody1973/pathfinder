# PathFinder: The Full Platform Vision

## From SkillSync to a Career Learning Platform

### The Origin Story

On September 30, 2024, Tarik Moody started building SkillSync for the AfroTech AI Hackathon. He described himself as "learning how to program Python" and "the sole developer." He built the entire application in Streamlit — backend and frontend, all Python — and connected it to seven different APIs: Perplexity, Groq, OpenAI, SerpAPI, Google Scholar, YouTube Data, and the Department of Education College Scorecard.

Nine days later, on October 9, he posted an update on Devpost:

> *"Someone gave me idea of adapting this for high school juniors and seniors, by using questions that a guidance counselor would ask."*

Then again the next day, October 10:

> *"Someone suggested I can adapt this app for High School Guidance counselors for junior and seniors. I think it would be very cool."*

That seed has been sitting for 18 months. In the time since, Tarik has built Crate (a full agentic music research app with MCP servers and OpenUI rendering), Hakivo (a civic engagement platform with AI-generated audio briefings using ElevenLabs), REDLINED (3D data visualization), First Bite, StoryForge, PlateWise, and competed in a half-dozen hackathons. He's gone from Streamlit scripts to Next.js with the Anthropic SDK, from single API calls to multi-agent orchestration, from simple prototypes to production-grade deployments.

The career counselor idea isn't starting from scratch. It's the full-circle culmination of everything he's learned.

---

## Part 1: What SkillSync Got Right

### The Wins

**1. Multi-API orchestration from day one.** SkillSync connected seven APIs in a single application — Perplexity for career advice, Groq for recommendations, SerpAPI for job listings, Google Scholar for research, YouTube for educational content, and the College Scorecard for institutional data. This instinct to pull from multiple authoritative sources rather than relying on a single LLM for everything was architecturally correct.

**2. The equity framing was structural, not cosmetic.** SkillSync was explicitly designed to address the upskilling gap facing underrepresented groups. The Devpost description cites that only 42% of Black, Hispanic, and Asian American/Pacific Islander workers have access to company-paid upskilling, while 80% of Black workers without access would use it if offered. This isn't a feature — it's the foundation.

**3. Personalized profile → guidance loop.** SkillSync's six core features (profile creation, AI-driven guidance, curated resources, job matching, industry insights, adaptive learning paths) map almost exactly to what ASCA defines as the core functions of career counseling.

**4. SQLite for persistence.** Even in a hackathon, he built session persistence. Career exploration is a journey, not a single conversation.

### The Lessons

**1. Streamlit was the right tool for the moment, not the future.** PathFinder builds on the Next.js + Anthropic SDK stack from Crate and Hakivo.

**2. Multiple LLM providers created complexity without clear benefit.** The Anthropic SDK gives one unified interface with Claude handling reasoning, while specialized tools (BLS API, O*NET API, ElevenLabs) handle domain-specific functions.

**3. The "challenges" section is a roadmap.** Every challenge documented in SkillSync has a more mature solution now: API integration → tool use/function calling, Data processing → structured outputs, UX → OpenUI component rendering, Performance → parallel agent execution, Privacy → session-scoped data.

**4. The guidance counselor adaptation wasn't just a "nice idea" — it's a product.** Two different people told him this. The market signal was there.

---

## Part 2: The Oboe Model

Oboe (oboe.fyi) was founded by Nir Zicherman and Michael Mignano, the co-founders of Anchor (which Spotify acquired). The core insight: a single prompt triggers a parallel multi-agent pipeline that generates a complete, multi-format learning package in seconds.

Oboe's architecture:
- **Curriculum Architect Agent** — designs chapter-based course structure
- **Content Generation Agents** — draft learning material for each module
- **Verification/Audit Agents** — fact-check to reduce hallucinations
- **Audio Script Agent** — writes scripts for lecture and two-host podcast formats
- **Image Sourcing Agent** — pulls real (not AI-generated) images

Over two-thirds of Oboe prompts are goal-oriented. Users know what they want to achieve; they just don't know how to get there. Oboe restructured around goal-driven chapter-based courses rather than chatbot Q&A.

The platform tracks engagement with mastery heat maps, streak counters, and spaced repetition scheduling for long-term retention.

**Why this model fits career counseling:** The fundamental problem Oboe solved is the same problem career counseling faces — chatbot Q&A is the wrong modality for structured learning journeys. A student doesn't need to ask 47 questions to understand a career path. They need a generated, structured, multi-format package they can consume at their own pace, with the option to go deeper.

---

## Part 3: PathFinder as a Two-Sided Platform

### The Product Pivot

PathFinder is not a chatbot. It's not even a tool. It's a **two-sided platform** where:
- **Learners** (students, graduates, career changers) consume personalized career exploration and skill-building content
- **Counselors** (school counselors, career coaches, workforce development staff) operate the platform to manage caseloads, assign paths, track progress, and identify who needs human intervention

The counselor is a first-class user, not an afterthought.

### Four Audiences, Four Path Types

**High School Students (Ages 14–18) — "Discover" Paths**
- 4-week intro modules with YouTube playlists, hands-on tasters, career day-in-the-life content
- Focus on exploration, not decision. All pathways presented equally
- Accessible language, connected to broad career clusters
- Sensitive to family expectations and cultural context

**Recent High School Graduates (Ages 18–20) — "Launch" Paths**
- 8-week skill-building with free certifications, application prep, financial planning
- Trade school, apprenticeship, military, and college pathways
- Balance exploration with action planning
- Addresses common anxieties: comparison to peers, financial pressure

**Recent College Graduates (Ages 21–26) — "Accelerate" Paths**
- 6-week intensive with portfolio projects, resume workshops, interview simulations
- Translates academic experience into professional language
- Addresses imposter syndrome and the gap between expectation and reality

**Career Changers (Ages 25–55) — "Pivot" Paths**
- 10-week transition programs with skill-gap analysis and bridge content
- O*NET skill diff: maps current career skills against target career, generates only the delta
- A 10-year teacher pivoting to UX design doesn't need "Intro to Communication" — they need "Translating classroom facilitation into user research methodology"
- Respects existing experience and financial obligations

### The Counselor Dashboard

The counselor doesn't just recommend PathFinder to students — they operate inside it.

**Caseload Overview** — All assigned students at a glance. Color-coded: active (green), stalled (amber), at-risk (red), completed (blue). Filter by grade, pathway, engagement level.

**Assign & Curate** — Counselors assign pre-built paths, customize generated paths (add/remove modules, swap resources), or create their own. Assign to individuals or cohorts: "All 11th graders get the Career Discovery path this semester."

**Progress Analytics** — Aggregate data: trending careers with this cohort, dropout points, lowest-completion modules, most-engaged resources. Exportable reports for administrators and school boards.

**Smart Alerts** — AI flags students who: haven't logged in for 7+ days, scored below threshold on assessments, expressed uncertainty in chat, or are approaching decision deadlines (college apps, enlistment dates, etc.).

**Counselor Workflow:**
Onboard cohort → Students self-assess → AI generates paths → Counselor reviews + adjusts → Students learn → Dashboard monitors → Human check-ins where needed

The AI handles the 80%. The counselor focuses on the 20% that requires human judgment.

### Beyond School Counselors

| Counselor Type | Setting | How They Use PathFinder |
|---|---|---|
| School counselors | High schools | Assign to cohorts, track across semesters, generate reports |
| College career centers | Universities | Senior year transition, alumni career change support |
| Workforce development | Community orgs, job centers | Reskilling programs, career changer paths |
| Private career coaches | Independent practice | Client management, branded paths, premium tools |
| Military transition | SkillBridge, VA | MOS-to-civilian career mapping, skill translation |

---

## Part 4: The Learning Path Engine

### Why This Is the Killer Feature

The career counselor tells you "Sound Engineering is a strong match for your profile." That's valuable for about five minutes. What keeps a student coming back every day for three months is a generated, trackable curriculum that's teaching them the actual skills they need, surfacing real content from the internet, and showing them progress.

PathFinder would be the first to combine **career assessment → occupation data → generated curriculum → multi-format content → trackable progress** in a single loop.

### The Curriculum Generation Pipeline

**Step 1: Curriculum Architect Agent** takes a career match and decomposes it into skill domains using O*NET's detailed skill requirements. Maps these into a phased learning sequence using Bloom's Taxonomy (Remember → Understand → Apply → Analyze → Evaluate → Create).

**Step 2: Four parallel content agents** (the Oboe pattern):

- **Lesson Agent** — writes narrative instructional content grounded in O*NET skills. Voice: "Write as if you're a working professional explaining to an apprentice."
- **Resource Agent** — curates YouTube playlists, free courses, trade publication articles, and podcast episodes mapped to specific skill domains
- **News Agent** — pulls current industry trends, job market shifts, emerging technologies
- **Assessment Agent** — generates varied assessments: quick-check quizzes (Bloom's 1-2), scenario questions (3-4), hands-on project briefs (5-6), reflection prompts (metacognition)

**Step 3: Quality Auditor Agent** reviews all content for accuracy, readability, appropriate difficulty, and coherence. Flags anything generic.

**Step 4: Assembled curriculum** rendered through the OpenUI component system.

### Udacity-Quality Without Udacity-Cost

What makes Udacity's Nanodegrees stick isn't production value — it's pedagogical design:

**Bloom's Taxonomy scaffolding** — each module progresses through cognitive levels. Enforced structurally in the generation pipeline, not suggested.

**Multimodal by default** — every module ships with: AI-written lesson text, curated YouTube playlist, AI-generated audio lecture, live industry news, curated articles, quiz, AND hands-on project.

**Real-world projects, not exercises** — every project creates a portfolio artifact. "Record and mix a 3-track demo" not "List 5 recording techniques." The output IS the credential.

**Mentorship + feedback** — AI counselor provides project feedback, human counselor handles escalations, peer review for cohort-based paths.

**Cost advantage:** Udacity charges $249/month because humans build each course by hand. PathFinder's AI pipeline generates equivalent structural quality at near-zero marginal cost. The student-facing product can be free for the core experience, with institutional licensing as revenue.

### Progress Tracking (Oboe-Inspired, Career-Adapted)

**Mastery Heat Map** — visual grid of proficiency across skill domains, mapped to O*NET's taxonomy. Students track themselves against real job requirements.

**Streak + XP** — daily engagement nudges. 15 minutes daily beats 3 hours on Saturday. Grounded in spaced repetition research.

**Spaced Review** — key concepts resurface at increasing intervals (FSRS algorithm). Learn EQ in week 4; recall prompts in weeks 5, 7, and 10.

**Portfolio Builder** — every project becomes a portfolio artifact. By the end of a 12-week path, the student has a demo reel, completed projects, written reflections, and a job-ready portfolio.

### The Adaptive Loop

The system watches engagement and adjusts. Breezing through acoustics → compress and surface advanced content. Struggling with music theory → expand with additional tutorials and more frequent review.

Interest detection: if someone on a Sound Engineering path keeps clicking into live event content, the system suggests a pivot: "You seem drawn to live sound — want me to generate a path focused on Live Event Audio Production?"

---

## Part 5: The Content Pipeline (SkillSync Evolved)

| SkillSync (2024) | PathFinder (2026) |
|---|---|
| YouTube Data API → general career videos | YouTube Data API → curated playlists per module, ranked by O*NET skill relevance |
| SerpAPI → job listings | Web search → industry news feed, refreshed weekly |
| Google Scholar → research papers | Google Scholar → trade publications matched to skill domains |
| Perplexity → general career advice | Claude → structured lesson content grounded in O*NET |
| College Scorecard → school info | College Scorecard + Apprenticeship.gov → pathway options with ROI |
| SQLite → basic profiles | Convex → real-time progress, streaks, scores, portfolio, spaced review |

The difference isn't the APIs — it's the orchestration.

---

## Part 6: Technical Architecture

### Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Same stack as Crate; SSR, RSC for streaming |
| UI Rendering | OpenUI pattern from Crate | Structured chat → interactive React components |
| LLM | Anthropic SDK (Sonnet for conversation, Opus for planning) | Unified API, tool use, streaming |
| Audio | ElevenLabs (from Hakivo) | Career briefing generation |
| Database | Convex or Supabase | Real-time session state, progress tracking |
| Career Data | BLS OOH, O*NET, CareerOneStop, College Scorecard APIs | Authoritative government occupation data |
| Auth | WorkOS (from Hakivo) | Enterprise-ready for schools |
| Deployment | Railway or Vercel | Familiar infrastructure |

### What PathFinder Inherits From Each Project

| From SkillSync | From Crate | From Hakivo |
|---|---|---|
| Multi-API career data orchestration | OpenUI structured rendering | ElevenLabs audio pipeline |
| Equity-first design philosophy | Slash command patterns | WorkOS authentication |
| Profile → guidance loop | MCP server architecture | Cloud storage for audio |
| College Scorecard integration | Next.js + Anthropic SDK | Go-to-market thinking |
| YouTube content curation | Agentic conversation patterns | Pricing strategy framework |

---

## Part 7: Business Model

### B2C Tiers (Individual Learners)
- **Free:** Career assessment, 1 "Discover" path, basic progress tracking
- **Plus ($12/mo):** Unlimited paths, audio briefings, advanced assessments, resume builder, portfolio
- **Pro ($25/mo):** Everything + AI interview practice, mentor matching, job board integration, certificate

### B2B Tiers (Institutions)
- **School License:** Per-student annual pricing. Counselor dashboard, cohort management, ASCA-aligned reports
- **Workforce Development:** Bulk licensing for job centers, community orgs. Custom paths for local labor markets
- **Enterprise:** Career coaching firms, military transition. White-label, API access

### Funding Pathways
- **Education grants:** Title I, Perkins CTE, WIOA workforce innovation grants
- **Civic tech funders:** Knight Foundation, Mozilla, Ford Foundation — equity-focused ed-tech
- **The narrative:** "Built at AfroTech to address the career guidance gap for underrepresented communities. Now a platform serving 400-student caseloads."

---

## Part 8: The Bumwad Build Phases

### Phase 1: Research & Concept ✅
Career counseling theory, ASCA/NCDA frameworks, Oboe architecture study, SkillSync retrospective, system prompt design

### Phase 2: Design Development
Agent pipeline specification, API contracts, OpenUI component library, audio pipeline architecture, session state schema

### Phase 3: Refinement
Orchestrator Agent build, Profile Agent (RIASEC + values), Research Agent (BLS/O*NET tools), Curriculum Architect Agent, parallel pipeline testing

### Phase 4: Construction Documentation
Full frontend (Next.js + OpenUI), Pathway + Audio agents, session persistence (Convex), auth (WorkOS), counselor dashboard, deploy

### Phase 5: Construction
Beta with real students, conversation flow iteration, equity audit, accuracy audit, ship v1

---

*Version 2.0 — March 2026*
*From a hackathon seed to a platform blueprint in 18 months.*
