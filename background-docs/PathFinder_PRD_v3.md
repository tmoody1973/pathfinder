# PathFinder — Product Requirements Document
## AI-Powered Career Learning Platform
### Version 3.0 — March 2026

---

# Table of Contents

1. Executive Summary
2. Origin Story & Project Lineage
3. Problem Statement
4. Target Audiences
5. Theoretical Foundation
6. Platform Architecture
7. Framework Decision: Custom Orchestration on Anthropic SDK
8. The Agent Pipeline
9. The Learning Path Engine
10. Course Quality Standard (Udacity-Grade)
11. The Counselor Dashboard
12. Data Sources & APIs
13. Technical Stack
14. Session State & Data Schema
15. Business Model
16. Build Phases
17. Appendix A: System Prompt (PathFinder Counselor Agent)
18. Appendix B: Curriculum Architect Agent Specification
19. Appendix C: Custom Orchestration Layer Code Architecture
20. Appendix D: Output Schema Contracts

---

# 1. Executive Summary

PathFinder is a two-sided AI-powered career learning platform that serves learners (high school students, recent graduates, career changers) and counselors (school counselors, career coaches, workforce development staff). It combines AI career counseling with Oboe-style generated learning paths, trackable progress, and a counselor command center.

The platform generates personalized, Udacity-quality career exploration curricula using a multi-agent pipeline built on the Anthropic TypeScript SDK. It does not use an agent framework (CrewAI, LangGraph, etc.) — instead it runs a thin custom orchestration layer (~200 lines of TypeScript) that dispatches parallel agent calls, collects results, and renders structured output through OpenUI React components.

PathFinder inherits architecture patterns from three prior projects: SkillSync (multi-API career data orchestration, equity-first design), Crate (OpenUI structured rendering, Anthropic SDK patterns), and Hakivo (ElevenLabs audio pipeline, WorkOS auth).

---

# 2. Origin Story & Project Lineage

## The Seed

On September 30, 2024, Tarik Moody built SkillSync for the AfroTech AI Hackathon — a Streamlit application connecting seven APIs (Perplexity, Groq, OpenAI, SerpAPI, Google Scholar, YouTube Data, College Scorecard) to provide AI-powered career guidance. Nine days later, he posted on Devpost:

> "Someone gave me idea of adapting this for high school juniors and seniors, by using questions that a guidance counselor would ask."

That seed has been germinating for 18 months while the technical stack matured.

## What Each Project Contributes

| Project | Year | What PathFinder Inherits |
|---------|------|------------------------|
| **SkillSync** | 2024 | Multi-API career data orchestration, equity-first design philosophy, profile-to-guidance loop, YouTube + Scholar + College Scorecard integration, SQLite persistence pattern |
| **Crate** | 2025 | OpenUI structured rendering (chat output → interactive React components), slash command patterns, MCP server architecture, Next.js + Anthropic SDK stack, agentic conversation patterns |
| **Hakivo** | 2025 | ElevenLabs audio generation pipeline, WorkOS authentication, cloud storage for audio, legislative API integration patterns (→ career API patterns), go-to-market and pricing strategy |

## The Oboe Model

Oboe (oboe.fyi), built by the co-founders of Anchor/Spotify, provides the architectural inspiration. Oboe's multi-agent pipeline takes a single prompt and generates a complete multi-format learning package in parallel: curriculum architect → content agents → verification → multi-format output (text, podcast, quiz, game). PathFinder adapts this pattern for career-specific content generation.

Key Oboe insights adopted:
- Chatbot Q&A is the wrong modality for structured learning journeys
- Parallel agent execution for speed
- Multi-format output (text + audio + interactive + assessment)
- Progress tracking with mastery heat maps, streaks, and spaced repetition
- Over two-thirds of user prompts are goal-oriented — generate the structured package upfront

---

# 3. Problem Statement

The average school counselor manages a caseload of over 400 students. Research shows each meaningful career conversation in middle and high school is associated with a 0.8% increase in future wage earnings at age 26 (OECD, 2017). But counselors can't have meaningful individualized conversations with 400 students.

Only 42% of Black, Hispanic, and Asian American/Pacific Islander workers have access to company-paid upskilling, while 80% of Black workers without access would use it if offered (AfroTech/SkillSync research, 2024).

Existing tools fail in specific ways:
- **Career Path Hacker** etc. deliver static PDF plans by email — no tracking, no learning content
- **Oboe** generates interactive courses but has no career intelligence underneath
- **Udacity/Udemy** offer high-quality courses but at $249/month and without career assessment integration
- **School counseling** provides human judgment but can't scale to every student

PathFinder is the first to combine: **career assessment → occupation data → generated curriculum → multi-format content → trackable progress → counselor oversight** in a single loop.

---

# 4. Target Audiences

## Learners

### High School Students (Ages 14–18) — "Discover" Paths
- 4-week intro modules with YouTube playlists, hands-on tasters, day-in-the-life content
- Focus on exploration, not decision; all pathways presented equally
- Accessible language, connected to broad career clusters (not specific jobs)
- Sensitive to family expectations and cultural context
- Projects: tasters and reflections, not portfolio-grade work

### Recent High School Graduates (Ages 18–20) — "Launch" Paths
- 8-week skill-building with free certifications, application prep, financial planning
- Trade school, apprenticeship, military, and college pathways equally presented
- Balance exploration with action planning; address comparison anxiety and financial pressure
- Projects: entry-level portfolio quality

### Recent College Graduates (Ages 21–26) — "Accelerate" Paths
- 6-week intensive with portfolio projects, resume workshops, interview simulations
- Translates academic experience into professional language
- Addresses imposter syndrome and expectation-reality gap
- Projects: professional portfolio quality with industry-standard tools

### Career Changers (Ages 25–55) — "Pivot" Paths
- 10-week transition programs with O*NET skill-gap analysis
- Generates only bridge content — skips what they've already mastered
- A 10-year teacher pivoting to UX design gets "Translating classroom facilitation into user research methodology," not "Intro to Communication Skills"
- Projects: bridge projects demonstrating translation of existing skills
- Respects existing experience and financial obligations

## Counselors (Platform Operators)

| Type | Setting | How They Use PathFinder |
|------|---------|------------------------|
| School counselors | High schools | Assign to cohorts, track across semesters, generate reports for admin |
| College career centers | Universities | Senior year transition paths, alumni career change support |
| Workforce development | Community orgs, job centers | Reskilling programs, career changer paths, local labor market customization |
| Private career coaches | Independent practice | Client management, branded paths, premium assessment tools |
| Military transition | SkillBridge, VA | MOS-to-civilian career mapping, skill translation paths |

---

# 5. Theoretical Foundation

PathFinder's guidance is grounded in four established career development frameworks:

**Holland's RIASEC Model** — Six personality types (Realistic, Investigative, Artistic, Social, Enterprising, Conventional) mapped to work environments. Agent implements conversational assessment that produces a profile, not a single label.

**Super's Life-Span Theory** — Career development as a lifelong process with distinct stages. The Orchestrator detects which sub-stage a user is in (crystallizing, specifying, implementing) and adjusts agent behavior accordingly.

**Bandura's Self-Efficacy Theory** — The agent actively builds career confidence by reflecting strengths back to users, celebrating progress, and never dismissing aspirations.

**Krumboltz's Planned Happenstance** — The agent normalizes uncertainty and encourages curiosity, persistence, flexibility, optimism, and informed risk-taking.

The learning path engine enforces **Bloom's Taxonomy** progression (Remember → Understand → Apply → Analyze → Evaluate → Create) at the structural level — not as a suggestion, but as a constraint in the curriculum generation pipeline.

**Spaced repetition** (FSRS algorithm) is built into every learning path. Key concepts resurface at 1-day, 3-day, 7-day, and 21-day intervals after module completion.

---

# 6. Platform Architecture

```
                    ┌─────────────────────────┐
                    │    Next.js Frontend      │
                    │  (OpenUI Components)     │
                    └────────┬────────────────┘
                             │ SSE streaming
                    ┌────────▼────────────────┐
                    │   API Routes (Next.js)   │
                    │  Custom Orchestration    │
                    │     Layer (~200 LOC)     │
                    └────────┬────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼──┐  ┌───────▼───┐  ┌───────▼───┐
     │ Counselor  │  │  Learner   │  │  Learning  │
     │   Agent    │  │   Agent    │  │   Path     │
     │ (PathFinder│  │ (Assessment│  │   Engine   │
     │  Prompt)   │  │  + Chat)   │  │ (Curriculum│
     │            │  │            │  │  Pipeline) │
     └────────────┘  └────────────┘  └─────┬─────┘
                                           │
                              ┌─────────────┼─────────────┐
                              │             │             │
                     ┌────────▼──┐ ┌────────▼──┐ ┌───────▼────┐
                     │  Parallel  │ │  Parallel  │ │  Parallel  │
                     │  Content   │ │  Resource  │ │ Assessment │
                     │  Agents    │ │  Agents    │ │  Agent     │
                     └────────────┘ └────────────┘ └────────────┘
                              │             │             │
                     ┌────────▼─────────────▼─────────────▼──┐
                     │         Quality Auditor Agent          │
                     └────────────────┬──────────────────────┘
                                      │
                     ┌────────────────▼──────────────────────┐
                     │        OpenUI Render Layer             │
                     │   Structured JSON → React Components   │
                     └───────────────────────────────────────┘
                                      │
              ┌───────────┬───────────┼───────────┬───────────┐
              ▼           ▼           ▼           ▼           ▼
         Career      Audio       Decision     Document    Progress
         Modules     Briefings   Tools        Builder     Tracker

─────────────────── Data Layer ───────────────────────────────
  BLS OOH    O*NET    CareerOneStop    College    Apprenticeship
   API        API       API           Scorecard      .gov

─────────────────── State Layer ──────────────────────────────
  Convex (real-time): profiles, progress, streaks, scores,
  portfolio items, spaced review schedule, counselor configs
```

---

# 7. Framework Decision: Custom Orchestration on Anthropic SDK

## Decision

PathFinder uses a **thin custom orchestration layer (~200 lines of TypeScript)** built on the Anthropic TypeScript SDK. It does not adopt CrewAI, LangGraph, the Claude Agent SDK, or any other agent framework.

## Rationale

### Why not CrewAI
- **Python-only** — PathFinder's entire stack is Next.js/TypeScript. CrewAI would require a separate Python backend or language bridge.
- **No streaming** — PathFinder needs real-time streaming to the React UI as agents work. CrewAI returns results after all agents complete.
- **Prototyping tool** — CrewAI's strength is fast prototyping. Teams often migrate to LangGraph for production. PathFinder is past prototyping.

### Why not LangGraph
- **Overkill** — PathFinder's pipeline is fan-out/fan-in, not complex conditional routing. LangGraph's graph state machine adds cognitive overhead without solving a problem PathFinder has.
- **JS support is weaker** — LangGraph's TypeScript version has fewer features and less community support than Python.
- **Vendor coupling** — Pulls in LangChain ecosystem (LangSmith, LangGraph Cloud) as additional vendor dependencies.

### Why not the Claude Agent SDK
- **Wrong abstraction** — Designed for code-centric, filesystem tasks (Bash, Glob, Read, Write, Edit). PathFinder needs API orchestration, curriculum generation, and React UI streaming.
- **CLI-oriented** — Streams output to terminal, not web UI. Significant glue code needed for Next.js integration.

### Why custom works
- **Already known** — Built Crate and Hakivo on the Anthropic TypeScript SDK. Zero new learning curve.
- **TypeScript-native** — Runs in Next.js API routes. No language bridge, no separate deployment.
- **Full streaming control** — Anthropic SDK streaming pipes directly into React Server Components.
- **Simple pipeline** — PathFinder's orchestration is: detect audience → parallel dispatch → collect → audit → render. That's `Promise.allSettled()`, not a graph framework.
- **No extra vendor lock** — Only dependency beyond Anthropic is the APIs being called (BLS, O*NET, etc.).

### Escape hatch
If the pipeline becomes genuinely complex (conditional routing, retry loops, multi-step agent conversations), the migration path is LangGraph TypeScript. Tool definitions port directly since LangGraph uses the same Anthropic tool format.

## The Orchestration Layer Architecture

```typescript
// ~200 lines total, five components:

// 1. Agent Registry (~30 lines)
// Map of agent configs: name, systemPrompt, tools, model
// Each agent is a config object, not a class
const agents: Record<string, AgentConfig> = {
  orchestrator: { model: "claude-sonnet-4-20250514", systemPrompt: "...", tools: [...] },
  profileAgent: { model: "claude-sonnet-4-20250514", systemPrompt: "...", tools: [...] },
  researchAgent: { model: "claude-sonnet-4-20250514", systemPrompt: "...", tools: [...] },
  pathwayAgent: { model: "claude-opus-4-20250414", systemPrompt: "...", tools: [...] },
  audioAgent: { model: "claude-sonnet-4-20250514", systemPrompt: "...", tools: [...] },
  curriculumArchitect: { model: "claude-opus-4-20250414", systemPrompt: "...", tools: [...] },
  auditAgent: { model: "claude-sonnet-4-20250514", systemPrompt: "...", tools: [] },
};

// 2. Orchestrator Function (~50 lines)
// Takes user input + session context
// Calls Claude once to determine audience type and routing
// Returns dispatch plan: which agents, what order, what inputs
async function orchestrate(input: UserInput, session: Session): Promise<DispatchPlan>

// 3. Parallel Dispatcher (~40 lines)
// Takes dispatch plan
// Runs Promise.allSettled() on agent calls
// Each agent is a standard Anthropic SDK messages.create() call
async function dispatch(plan: DispatchPlan): Promise<AgentResult[]>

// 4. Audit Pass (~30 lines)
// Takes merged results
// Runs one more Claude call with fact-checking system prompt
// Returns verified output
async function audit(results: AgentResult[]): Promise<VerifiedOutput>

// 5. Render Pipeline (~50 lines)
// Takes verified JSON
// Maps to OpenUI React components
// Streams to frontend via SSE
async function render(output: VerifiedOutput, stream: WritableStream): Promise<void>
```

### Key Design Principle: Agent-as-Config

Borrowed from CrewAI's mental model but without the framework. Each agent is defined as a configuration object:

```typescript
interface AgentConfig {
  name: string;
  model: "claude-sonnet-4-20250514" | "claude-opus-4-20250414";
  systemPrompt: string;
  tools: Anthropic.Tool[];
  maxTokens: number;
  temperature?: number;
}
```

The dispatcher reads configs and makes standard SDK calls. No agent classes, no inheritance, no framework magic. The agent registry is a plain TypeScript object that can be edited, versioned, and tested like any other config.

### Parallel Execution Pattern

```typescript
async function dispatchParallel(
  agentNames: string[],
  sharedContext: Record<string, unknown>
): Promise<AgentResult[]> {
  const calls = agentNames.map(name => {
    const config = agents[name];
    return anthropic.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      system: config.systemPrompt,
      tools: config.tools,
      messages: [{ role: "user", content: buildPrompt(name, sharedContext) }]
    });
  });

  const results = await Promise.allSettled(calls);

  return results.map((result, i) => ({
    agent: agentNames[i],
    status: result.status,
    output: result.status === "fulfilled" ? result.value : null,
    error: result.status === "rejected" ? result.reason : null,
  }));
}
```

### Error Handling

If an agent fails, the pipeline continues with the remaining results. The Audit Agent notes which data is missing and the UI renders a partial result with a "some data unavailable" indicator. No cascading failures.

---

# 8. The Agent Pipeline

## Pipeline Modes

### Mode 1: Career Counseling (Conversational)
```
User message → Orchestrator → Counselor Agent → Stream response
                                    ↓ (tool calls as needed)
                              BLS/O*NET/CareerOneStop lookups
```

### Mode 2: Learning Path Generation (Parallel Pipeline)
```
Career match + profile
       ↓
  Orchestrator (audience detection + routing)
       ↓
  Curriculum Architect Agent (designs structure)
       ↓
  ┌────┬────┬────┐  (parallel)
  ▼    ▼    ▼    ▼
Lesson Resource News Assessment
Agent  Agent  Agent Agent
  └────┴────┴────┘
       ↓
  Quality Auditor Agent
       ↓
  OpenUI Render → React Components
```

### Mode 3: Document Generation (Sequential)
```
User request → Orchestrator → Document Agent → Generate resume/cover letter/plan
```

## Agent Specifications

| Agent | Model | Role | Tools |
|-------|-------|------|-------|
| **Orchestrator** | Sonnet | Audience detection, stage identification, routing | `detect_audience()`, `identify_stage()` |
| **Counselor** | Sonnet | Conversational career guidance (PathFinder system prompt) | `bls_lookup()`, `onet_lookup()`, `careeronestop_salary()` |
| **Profile** | Sonnet | Conversational RIASEC, values, skills assessment | `riasec_score()`, `values_rank()`, `skills_inventory()` |
| **Research** | Sonnet | Occupation data with verified salary, outlook, requirements | `bls_occupation_data()`, `onet_skills_match()`, `related_careers()` |
| **Pathway** | Opus | Complex multi-pathway planning with timelines and costs | `education_pathways()`, `apprenticeship_search()`, `certification_finder()` |
| **Audio** | Sonnet + ElevenLabs | Career briefing audio generation (lecture + two-host) | `generate_script()`, `elevenlabs_tts()` |
| **Curriculum Architect** | Opus | Designs Bloom's-enforced learning path structure | `onet_occupation_lookup()`, `onet_skills_match()`, `bls_occupation_data()`, `education_pathways()`, `related_careers()` |
| **Lesson** | Sonnet | Writes narrative instructional content per module | None (receives spec from Architect) |
| **Resource** | Sonnet | Curates YouTube, articles, free courses per module | `youtube_search()`, `web_search()`, `scholar_search()` |
| **News** | Sonnet | Pulls current industry trends for career context | `web_search()` |
| **Assessment** | Sonnet | Generates quizzes, project briefs, reflection prompts | None (receives spec from Architect) |
| **Auditor** | Sonnet | Cross-references facts, validates Bloom's levels, flags generic content | `bls_verify()`, `onet_verify()` |

---

# 9. The Learning Path Engine

## How It Works

1. **Curriculum Architect Agent** takes a career match and decomposes it into skill domains using O*NET. Maps domains into a phased learning sequence enforcing Bloom's Taxonomy.

2. **Four parallel content agents** generate module content simultaneously:
   - **Lesson Agent** — narrative instructional text (1500-2500 words/module)
   - **Resource Agent** — curated YouTube playlists, free courses, trade articles
   - **News Agent** — current industry trends with "why this matters" context
   - **Assessment Agent** — quizzes (Bloom's 1-3), scenario questions (3-4), project briefs (5-6)

3. **Quality Auditor** validates accuracy, readability, Bloom's consistency, and flags generic content.

4. **Assembled curriculum** renders through OpenUI components.

## Module Anatomy

Every module contains:

| Component | Description | Source |
|-----------|-------------|--------|
| Lesson (10-min read) | Narrative explanation with analogies and "try this" micro-exercises | Lesson Agent |
| Video playlist (3-5 videos) | YouTube tutorials ranked by relevance, quality, recency | Resource Agent via YouTube Data API |
| Audio lecture (7 min) | Narrated deep-dive; lecture format or two-host discussion | Claude script → ElevenLabs TTS |
| Industry news (2-3 items) | Current trends with career context | News Agent via web search |
| Articles/resources (2-3) | Trade publications, free courses, practitioner content | Resource Agent via SerpAPI + Scholar |
| Quiz (3-5 questions) | Scenario-based, mapped to Bloom's level | Assessment Agent |
| Project | Portfolio-grade artifact with brief, deliverables, skills tags | Assessment Agent |
| Spaced review items | 3-5 key concepts scheduled for 1/3/7/21-day review | Curriculum Architect (FSRS) |

## Progress Tracking

- **Mastery Heat Map** — visual grid of proficiency across O*NET skill domains
- **Streak + XP** — daily engagement tracking; nudges 15 min/day over 3 hr/Saturday
- **Spaced Review** — FSRS algorithm schedules concept recall at increasing intervals
- **Portfolio Builder** — every project becomes a portfolio artifact; exportable on path completion

## Adaptive Loop

- Compresses phases when student breezes through
- Expands with additional resources when student struggles
- Detects interest shifts and suggests path pivots
- Adjusts difficulty based on quiz performance trends

---

# 10. Course Quality Standard (Udacity-Grade)

## What Makes Udacity Stick

Udacity uses Bloom's Taxonomy to design Nanodegrees, strategically stacking lessons so learners apply knowledge to open-ended projects. Multiple instructors, short video segments, and hands-on projects produce content that learners report retains longer than other sources.

## PathFinder's Quality Enforcement

### Structural (Curriculum Architect enforces these as constraints, not suggestions):
- Every module declares its Bloom's level
- Assessment types must match declared Bloom's level (no "Apply" quiz in a "Remember" module)
- Phase progression must advance through Bloom's levels
- Every module must include all seven components (lesson, videos, audio, news, articles, quiz, project)

### Content (Lesson Agent prompt engineering):
- Narrative voice, not encyclopedia voice ("Write as a working professional explaining to an apprentice")
- Analogies required for abstract concepts
- "Try this" micro-exercises embedded in every lesson section
- No generic explanations — grounded in O*NET skill requirements for the specific occupation

### Assessment:
- Quick-check quizzes test recall with scenario context, not bare memorization
- Project briefs produce tangible artifacts (recordings, documents, designs, code)
- "Answer these questions" is never a project; "Build this thing and reflect" is
- Reflection prompts develop metacognition

### Resources:
- YouTube playlists are curated by relevance to specific O*NET skills, not just topic
- Ranked by: skill relevance > production quality > recency > engagement
- Low-quality content filtered out
- Free or freemium only in core paths

### Cost Advantage:
Udacity charges $249/month because humans build each course by hand. PathFinder's AI pipeline generates equivalent structural quality at near-zero marginal cost per course. The student-facing product can be free for the core experience.

---

# 11. The Counselor Dashboard

The counselor is a first-class user, not an afterthought. The dashboard is the command center for managing caseloads.

## Views

### Caseload Overview
- Stat cards: active, stalled, at-risk, completed
- Aggregate metrics: avg. progress, avg. streak, weekly active
- Trending career paths in cohort
- Alert preview with quick action links

### Student List
- Filterable by status (active, stalled, at-risk, completed, new)
- Expandable cards: progress bar, streak, quiz average, last active
- Actions: view full path, send message, reassign path

### Smart Alerts
AI flags students who:
- Haven't logged in for 7+ days
- Quiz scores declining across modules
- Expressed uncertainty or distress in chat
- Approaching decision deadlines (college apps, enlistment dates)
- Completed full path (celebration + next step)

### Counselor Actions
- **Assign paths** to individuals or cohorts ("All 11th graders get Career Discovery this semester")
- **Customize generated paths** (add/remove modules, swap resources, adjust pacing)
- **Create custom paths** from scratch using the module library
- **Export reports** for administrators and school boards
- **Schedule check-ins** based on alert priority

## Counselor Workflow
```
Onboard cohort → Students self-assess → AI generates paths →
Counselor reviews + adjusts → Students learn → Dashboard monitors →
Human check-ins where needed
```

The AI handles the 80%. The counselor focuses on the 20% that requires human judgment.

---

# 12. Data Sources & APIs

| Source | What It Provides | Integration |
|--------|-----------------|-------------|
| **BLS Occupational Outlook Handbook** | 324 occupation profiles: duties, pay, outlook, education | API or web scrape; update annually |
| **O*NET Online** | 900+ occupations: skills, knowledge, abilities, technology, interests (RIASEC-coded) | O*NET Web Services API |
| **CareerOneStop** | Career exploration, salary by metro area, certification finder, training finder | CareerOneStop API |
| **College Scorecard** | Institution data: costs, graduation rates, earnings after graduation | Department of Education API |
| **Apprenticeship.gov** | Registered apprenticeship programs by occupation and location | Apprenticeship.gov API |
| **YouTube Data API** | Video search, playlist creation, engagement metrics | Google API (carried from SkillSync) |
| **Web Search** | Industry news, current trends, trade publications | Anthropic tool use or SerpAPI |
| **Google Scholar** | Academic and practitioner articles | Google Scholar API (carried from SkillSync) |
| **ElevenLabs** | Text-to-speech for audio lectures and career briefings | ElevenLabs API (carried from Hakivo) |

---

# 13. Technical Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 14 (App Router) | Same stack as Crate; SSR for SEO, RSC for streaming |
| **UI Rendering** | OpenUI pattern (from Crate) | Structured chat output → interactive React components |
| **LLM** | Anthropic TypeScript SDK | Unified API, tool use, streaming. Sonnet for conversation, Opus for complex planning |
| **Orchestration** | Custom (~200 LOC TypeScript) | Agent registry + parallel dispatcher + audit + render pipeline |
| **Audio** | ElevenLabs API | Career briefing generation (from Hakivo) |
| **Database** | Convex | Real-time session state, progress tracking, counselor configs |
| **Auth** | WorkOS | Enterprise-ready for school/institutional adoption (from Hakivo) |
| **Career Data** | BLS + O*NET + CareerOneStop + College Scorecard APIs | Authoritative government-sourced occupation data |
| **Deployment** | Vercel or Railway | Familiar infrastructure from prior projects |
| **Monitoring** | Vercel Analytics + custom logging | No LangSmith dependency |

---

# 14. Session State & Data Schema

Stored in Convex (real-time, reactive):

```typescript
// User profile
interface UserProfile {
  id: string;
  name: string;
  audienceType: "discover" | "launch" | "accelerate" | "pivot";
  hollandCode: string;          // e.g., "RIA"
  topValues: string[];
  identifiedSkills: string[];
  constraints: {
    budget: string;
    timeline: string;
    geographic: string;
    hoursPerWeek: number;
  };
  currentOccupation?: string;   // for career changers
  targetOccupations: string[];
  createdAt: string;
  updatedAt: string;
}

// Learning path
interface LearningPath {
  id: string;
  userId: string;
  careerTarget: string;
  onetCode: string;
  audienceType: string;
  pathType: "discover" | "launch" | "accelerate" | "pivot";
  phases: Phase[];
  capstoneProject: Project;
  educationPathways: EducationOption[];
  relatedCareers: RelatedCareer[];
  status: "active" | "paused" | "completed";
  assignedBy?: string;          // counselor ID if assigned
  createdAt: string;
}

// Progress tracking
interface Progress {
  userId: string;
  pathId: string;
  moduleId: string;
  lessonCompleted: boolean;
  videosWatched: number;
  quizScore: number | null;
  projectSubmitted: boolean;
  projectFeedback: string | null;
  spacedReviewsDue: SpacedReviewItem[];
  completedAt: string | null;
}

// Engagement metrics
interface Engagement {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
  lastActiveAt: string;
  dailyMinutes: number[];       // last 30 days
}

// Counselor config
interface CounselorConfig {
  id: string;
  name: string;
  institution: string;
  assignedStudents: string[];
  cohorts: Cohort[];
  alertPreferences: AlertConfig;
}
```

---

# 15. Business Model

## B2C Tiers (Individual Learners)
- **Free:** Career assessment, 1 "Discover" path, basic progress tracking
- **Plus ($12/mo):** Unlimited paths, audio briefings, advanced assessments, resume builder, portfolio
- **Pro ($25/mo):** Everything + AI interview practice, mentor matching, job board integration, certificate

## B2B Tiers (Institutions)
- **School License:** Per-student annual pricing. Counselor dashboard, cohort management, ASCA-aligned reports
- **Workforce Development:** Bulk licensing for job centers, community orgs. Custom paths for local labor markets
- **Enterprise:** Career coaching firms, military transition. White-label option, API access

## Funding Pathways
- Title I, Perkins CTE, WIOA workforce innovation grants (schools have budget lines for career readiness)
- Civic tech funders: Knight Foundation, Mozilla, Ford Foundation (equity-focused ed-tech)
- The narrative: "Built at AfroTech to address the career guidance gap for underrepresented communities"

---

# 16. Build Phases

## Phase 1: Research & Concept ✅ COMPLETE
- Career counseling theory research (ASCA, NCDA, Holland, Super, Bandura, Krumboltz)
- Oboe architecture study
- SkillSync retrospective
- System prompt design
- Framework decision (custom on Anthropic SDK)
- PRD and architecture documentation

## Phase 2: Design Development
- Custom orchestration layer implementation (~200 LOC)
- Agent registry with all agent configs
- Tool definitions for BLS, O*NET, CareerOneStop, College Scorecard APIs
- OpenUI component library: career module cards, pathway timelines, assessment visualizations, progress tracker
- Session state schema in Convex
- Audio pipeline architecture (ElevenLabs from Hakivo)

## Phase 3: Core Build
- Orchestrator Agent (audience detection, routing, dispatch)
- Counselor Agent (PathFinder system prompt + conversational guidance)
- Profile Agent (conversational RIASEC, values, skills)
- Research Agent (BLS/O*NET tool integration)
- Curriculum Architect Agent (Bloom's-enforced path generation)
- Parallel content pipeline (Lesson + Resource + News + Assessment agents)
- Quality Auditor Agent
- Test with sample career scenarios across all four audience types

## Phase 4: Platform Build
- Next.js frontend with OpenUI components
- Counselor dashboard (caseload overview, student list, smart alerts)
- Audio Agent + ElevenLabs integration
- Progress tracking + spaced repetition engine
- Portfolio builder
- Auth layer (WorkOS)
- Deploy to Vercel/Railway

## Phase 5: Beta & Ship
- Beta with 5-10 real students (Milwaukee connections)
- Counselor beta with 1-2 school counselors
- Iterate on conversation flow based on real usage
- Equity audit: are recommendations consistent across demographic groups?
- Accuracy audit: are career data references correct?
- Ship v1

---

# Appendix A: System Prompt (PathFinder Counselor Agent)

[Full system prompt as designed in the initial career counselor guide — see PathFinder_Career_Counselor_Agent_Guide.docx, Section 4.1]

Key elements:
- Identity: PathFinder, warm, encouraging, culturally responsive
- Four theoretical frameworks embedded
- Audience-adaptive behavior (HS student / HS grad / college grad / career changer)
- Five core capabilities: assessment, occupational info, pathway planning, document prep, decision support
- Conversation principles: ask before advise, explore all pathways, normalize uncertainty, build agency
- Safety boundaries: never pressure, never promise outcomes, always recommend human counselor for complex situations

---

# Appendix B: Curriculum Architect Agent Specification

[Full specification as designed — see PathFinder_Curriculum_Architect_Prompt.md]

Key elements:
- Bloom's Taxonomy enforcement at structural level
- O*NET skill decomposition method
- Audience-specific path templates (Discover/Launch/Accelerate/Pivot)
- FSRS spaced repetition scheduling
- Five tool definitions: onet_occupation_lookup, onet_skills_match, bls_occupation_data, education_pathways, related_careers
- Complete JSON output schema (contract for downstream agents)
- Counselor override points

---

# Appendix C: Custom Orchestration Layer Code Architecture

```
/lib/pathfinder/
  ├── agents/
  │   ├── registry.ts          # Agent configs (name, model, prompt, tools)
  │   ├── orchestrator.ts      # Audience detection + dispatch planning
  │   ├── dispatcher.ts        # Parallel execution via Promise.allSettled
  │   ├── auditor.ts           # Fact-checking + quality gate
  │   └── renderer.ts          # JSON → OpenUI component mapping
  ├── tools/
  │   ├── bls.ts               # BLS Occupational Outlook Handbook lookups
  │   ├── onet.ts              # O*NET occupation data + skill matching
  │   ├── careeronestop.ts     # Salary by region, certifications, training
  │   ├── college-scorecard.ts # Institution data, costs, outcomes
  │   ├── apprenticeship.ts    # Registered apprenticeship programs
  │   ├── youtube.ts           # Video search + playlist curation
  │   ├── elevenlabs.ts        # Text-to-speech audio generation
  │   └── web-search.ts        # Industry news + article curation
  ├── prompts/
  │   ├── counselor.ts         # PathFinder counselor system prompt
  │   ├── curriculum-architect.ts  # Learning path design prompt
  │   ├── lesson-writer.ts     # Module content generation prompt
  │   ├── resource-curator.ts  # YouTube/article curation prompt
  │   ├── news-agent.ts        # Industry trends prompt
  │   ├── assessment-designer.ts   # Quiz/project generation prompt
  │   └── auditor.ts           # Fact-checking prompt
  ├── schemas/
  │   ├── learning-path.ts     # Output schema for curriculum
  │   ├── module.ts            # Individual module schema
  │   ├── assessment.ts        # Quiz and project schemas
  │   └── progress.ts          # Progress tracking schema
  └── index.ts                 # Main entry: orchestrate(), generatePath(), chat()
```

---

# Appendix D: Output Schema Contracts

## Learning Path (Curriculum Architect → Downstream Agents)

```typescript
interface LearningPathOutput {
  pathId: string;
  title: string;
  audienceType: "discover" | "launch" | "accelerate" | "pivot";
  careerTarget: {
    title: string;
    onetCode: string;
    blsSummary: { medianSalary: number; jobOutlook: string; growthRate: string; entryEducation: string; };
  };
  skillDomains: SkillDomain[];
  phases: Phase[];
  capstoneProject: Project;
  educationPathways: EducationOption[];
  relatedCareers: RelatedCareer[];
  metadata: { generatedAt: string; totalModules: number; totalEstimatedHours: number; totalDurationWeeks: number; };
}
```

## Module (Curriculum Architect → Content Agents)

```typescript
interface ModuleSpec {
  id: string;
  number: number;
  title: string;
  skillDomain: string;
  bloomLevel: string;
  estimatedHours: number;
  lessonSpec: { objectives: string[]; keyConcepts: string[]; narrativePrompt: string; tryThisExercises: string[]; };
  videoPlaylistSpec: { searchQueries: string[]; minVideos: number; maxDuration: string; qualityFilters: string[]; };
  articleSpec: { searchQueries: string[]; sources: string[]; count: number; };
  assessmentSpec: { quizQuestions: number; bloomLevel: string; questionTypes: string[]; scenarioContext: string; };
  projectSpec: { title: string; brief: string; deliverables: string[]; skillsDemonstrated: string[]; bloomLevel: string; isPortfolioArtifact: boolean; estimatedHours: number; };
  spacedReviewItems: { concept: string; reviewPrompt: string; intervals: number[]; }[];
}
```

## Counselor Dashboard Data

```typescript
interface CounselorDashboardData {
  cohortStats: { total: number; active: number; stalled: number; atRisk: number; completed: number; avgProgress: number; avgStreak: number; };
  students: StudentSummary[];
  alerts: Alert[];
  trendingPaths: string[];
}

interface Alert {
  type: "stalled" | "at-risk" | "declining" | "deadline" | "celebrate";
  studentId: string;
  studentName: string;
  message: string;
  suggestedAction: string;
  priority: "high" | "medium" | "low";
  createdAt: string;
}
```

---

*PathFinder PRD v3.0 — March 2026*
*From a hackathon seed at AfroTech to a platform blueprint.*
*Custom orchestration on Anthropic SDK. No framework. Full control.*
