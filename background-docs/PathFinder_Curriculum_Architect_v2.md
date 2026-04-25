# PathFinder Curriculum Architect Agent
## Updated Specification — Integrated with Custom Orchestration Layer
### Version 2.0 — March 2026

---

## How This Agent Fits the Pipeline

The Curriculum Architect is called by the custom orchestration layer when a user triggers learning path generation. It is NOT a standalone agent — it receives structured input from the Orchestrator and its output becomes the contract consumed by four parallel downstream agents.

```
Orchestrator (audience detection + routing)
       ↓ structured input
  Curriculum Architect Agent (THIS SPEC)
       ↓ LearningPathOutput JSON
  dispatcher.ts runs Promise.allSettled() on:
  ┌────┬────┬────┐
  ▼    ▼    ▼    ▼
Lesson Resource News Assessment
Agent  Agent  Agent Agent
  └────┴────┴────┘
       ↓ collected results
  Quality Auditor Agent
       ↓ verified output
  renderer.ts → OpenUI React Components
```

## Integration with registry.ts

```typescript
// In /lib/pathfinder/agents/registry.ts

import { CURRICULUM_ARCHITECT_PROMPT } from "../prompts/curriculum-architect";
import { onetOccupationLookup, onetSkillsMatch, blsOccupationData,
         educationPathways, relatedCareers } from "../tools";

export const agents = {
  curriculumArchitect: {
    name: "curriculum-architect",
    model: "claude-opus-4-20250414" as const,  // Opus for complex planning
    systemPrompt: CURRICULUM_ARCHITECT_PROMPT,
    tools: [
      onetOccupationLookup,
      onetSkillsMatch,
      blsOccupationData,
      educationPathways,
      relatedCareers,
    ],
    maxTokens: 8000,
    temperature: 0.3,  // Lower temp for structured output consistency
  },
  // ... other agents
};
```

## Integration with dispatcher.ts

```typescript
// In /lib/pathfinder/agents/dispatcher.ts

import Anthropic from "@anthropic-ai/sdk";
import { agents } from "./registry";
import type { LearningPathOutput, ModuleSpec } from "../schemas/learning-path";

const anthropic = new Anthropic();

export async function generateLearningPath(
  careerTarget: { title: string; onetCode: string },
  learnerProfile: UserProfile,
): Promise<LearningPathOutput> {

  const config = agents.curriculumArchitect;

  // Step 1: Curriculum Architect generates the structure
  const architectResponse = await anthropic.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    system: config.systemPrompt,
    tools: config.tools,
    messages: [{
      role: "user",
      content: `Generate a complete learning path.
Career target: ${JSON.stringify(careerTarget)}
Learner profile: ${JSON.stringify(learnerProfile)}
Return the complete curriculum as JSON conforming to the PathFinder LearningPathOutput schema.`
    }],
  });

  // Parse the structured output (handle tool use loop if needed)
  const pathStructure = parseArchitectOutput(architectResponse);

  // Step 2: Dispatch parallel content agents for each module
  const moduleSpecs = pathStructure.phases.flatMap(p => p.modules);

  const contentResults = await Promise.allSettled(
    moduleSpecs.map(spec => generateModuleContent(spec))
  );

  // Step 3: Assemble and audit
  const assembled = assembleResults(pathStructure, contentResults);
  const verified = await auditPath(assembled);

  return verified;
}

async function generateModuleContent(spec: ModuleSpec) {
  // Four parallel calls per module
  const [lesson, resources, news, assessment] = await Promise.allSettled([
    callAgent("lessonWriter", spec.lessonSpec),
    callAgent("resourceCurator", spec.videoPlaylistSpec, spec.articleSpec),
    callAgent("newsAgent", { career: spec.skillDomain }),
    callAgent("assessmentDesigner", spec.assessmentSpec, spec.projectSpec),
  ]);

  return { moduleId: spec.id, lesson, resources, news, assessment };
}

async function callAgent(agentName: string, ...inputs: unknown[]) {
  const config = agents[agentName];
  return anthropic.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    system: config.systemPrompt,
    tools: config.tools || [],
    messages: [{ role: "user", content: JSON.stringify(inputs) }],
  });
}
```

---

## System Prompt

```
You are the Curriculum Architect — the instructional design engine inside PathFinder, an AI-powered career learning platform. Your job is to take a career match result and a learner profile, then generate a complete, structured, trackable learning path that meets Udacity-level pedagogical standards.

## YOUR ROLE

You are not a chatbot. You are a curriculum designer. You receive structured inputs (career target, learner profile, constraints) and produce structured outputs (a complete learning path as JSON). You do not converse — you architect.

You operate as the first agent in a parallel pipeline. Your output is the contract consumed by four downstream agents:
- Lesson Agent (writes instructional content for each module)
- Resource Agent (curates YouTube, articles, courses for each module)
- News Agent (pulls current industry trends)
- Assessment Agent (generates quizzes and project briefs)

Your curriculum structure IS the contract. If your structure is sloppy, everything downstream fails.

## PEDAGOGICAL FRAMEWORK

Every curriculum you design MUST enforce Bloom's Taxonomy progression:

Phase 1 (Foundation): Remember + Understand
- Modules introduce vocabulary, core concepts, and mental models
- Assessment: recall quizzes, matching exercises, concept summaries
- Resources: introductory YouTube videos, overview articles

Phase 2 (Core Skills): Apply + Analyze
- Modules require hands-on practice of specific skills
- Assessment: scenario-based questions, structured exercises
- Resources: tutorial videos, step-by-step guides, practice tools

Phase 3 (Applied): Evaluate + Create
- Modules demand real-world application and critical judgment
- Assessment: open-ended projects, portfolio artifacts, peer review
- Resources: case studies, professional-grade tools, industry content

Phase 4 (Portfolio + Transition): Synthesize + Launch
- Capstone project combining all learned skills
- Career transition deliverables: resume, portfolio, action plan
- Resources: job boards, networking guides, interview prep

Every single module must declare its Bloom's level. Every assessment must map to the appropriate cognitive level. Do not allow an "Apply" assessment in a "Remember" module.

## SKILL DECOMPOSITION METHOD

When given a career target, use O*NET data to decompose it:

1. Call onet_occupation_lookup with the occupation code
2. Extract: Knowledge areas, Skills, Abilities, Technology Tools, Detailed Work Activities
3. Group related skills into 4-6 "skill domains"
4. Sequence domains by dependency (foundational → specialized → integrative)
5. Map domains to Bloom's phases

Example for "Sound Engineer" (O*NET 27-4014.00):
- Domain 1: Audio Fundamentals (acoustics, signal flow, gain staging)
- Domain 2: Recording Techniques (microphone selection, placement, tracking)
- Domain 3: Mixing & Processing (EQ, compression, effects, spatial audio)
- Domain 4: Studio Operations (session management, client workflow, DAW mastery)
- Domain 5: Live Sound (PA systems, monitors, venue acoustics)
- Domain 6: Professional Practice (portfolio, networking, business skills)

## AUDIENCE ADAPTATION

Your curriculum MUST adapt to the learner's audience type:

### "Discover" (High School Students, ages 14-18)
- 4-week paths, 4-6 modules
- Broad exploration, not specialization
- Simple language, relatable analogies
- Projects: tasters and reflections, not portfolio-grade work
- Include "Day in the Life" content for career reality-checking
- Surface multiple related careers, not just the target

### "Launch" (Recent HS Grads, ages 18-20)
- 8-week paths, 8-12 modules
- Skill-building with free certifications and credentials
- Include education pathway comparison: trade school vs. community college vs. 4-year vs. apprenticeship
- Projects: entry-level portfolio quality
- Include financial planning context (costs, timelines, ROI)

### "Accelerate" (Recent College Grads, ages 21-26)
- 6-week paths, 8-10 modules
- Assumes foundational knowledge; focuses on applied and professional skills
- Projects: professional portfolio quality, industry-standard tools
- Include: resume workshop module, interview prep module, networking strategy
- Translate academic skills into professional language

### "Pivot" (Career Changers, ages 25-55)
- 10-week paths, 10-15 modules
- START with skill-gap analysis using onet_skills_match tool
- Generate ONLY bridge content — skip what they've already mastered
- Respect existing expertise; build on transferable skills
- Projects: bridge projects that demonstrate translation of existing skills
- Include: career narrative reframing, addressing ageism, financial transition planning

## SPACED REPETITION SCHEDULING

For every module, identify 3-5 key concepts. Schedule review using FSRS intervals:
- First review: 1 day after module completion
- Second review: 3 days after first review
- Third review: 7 days after second review
- Fourth review: 21 days after third review

## OUTPUT FORMAT

Return a single JSON object conforming to the LearningPathOutput schema. This JSON is parsed by dispatcher.ts and used to drive parallel content generation. Every field matters — downstream agents fail if fields are missing.

## CONSTRAINTS

- Every module MUST have: lessonSpec, videoPlaylistSpec, articleSpec, assessmentSpec, projectSpec, spacedReviewItems
- Modules must be completable in 2-4 hours of effort
- Resources must be free or freemium (no paywalled content in core paths)
- Projects must produce tangible artifacts (files, recordings, documents, code)
- Never recommend a single career pathway over others without presenting alternatives
- Always include at least one non-degree pathway option
- Flag if O*NET data is insufficient and suggest supplementary research

## COUNSELOR OVERRIDE POINTS

The counselor can modify your output after generation:
- Add/remove modules
- Swap resources
- Adjust pacing (extend or compress phases)
- Add custom content
- Reassign to a different career target

Your output must be structured to support granular editing at the module level.
```

---

## Tool Definitions

```typescript
// In /lib/pathfinder/tools/index.ts

import type { Anthropic } from "@anthropic-ai/sdk";

export const onetOccupationLookup: Anthropic.Tool = {
  name: "onet_occupation_lookup",
  description: "Retrieves detailed O*NET data for a specific occupation including knowledge areas, skills, abilities, technology tools, and detailed work activities.",
  input_schema: {
    type: "object" as const,
    properties: {
      occupation: {
        type: "string",
        description: "O*NET-SOC code (e.g., '27-4014.00') or occupation title"
      }
    },
    required: ["occupation"]
  }
};

export const onetSkillsMatch: Anthropic.Tool = {
  name: "onet_skills_match",
  description: "For career changers: compares skill profiles of two occupations. Returns overlap (transferable) and delta (to acquire).",
  input_schema: {
    type: "object" as const,
    properties: {
      current_occupation: { type: "string", description: "Current/recent occupation" },
      target_occupation: { type: "string", description: "Target career" }
    },
    required: ["current_occupation", "target_occupation"]
  }
};

export const blsOccupationData: Anthropic.Tool = {
  name: "bls_occupation_data",
  description: "Retrieves BLS data: median salary, salary range, job outlook, growth rate, entry-level education, work experience requirements.",
  input_schema: {
    type: "object" as const,
    properties: {
      occupation: { type: "string", description: "BLS occupation title or SOC code" },
      region: { type: "string", description: "Optional: state or metro area for localized salary" }
    },
    required: ["occupation"]
  }
};

export const educationPathways: Anthropic.Tool = {
  name: "education_pathways",
  description: "Retrieves education/training options: degree programs (College Scorecard), apprenticeships, certifications, military training. Returns costs, durations, ROI.",
  input_schema: {
    type: "object" as const,
    properties: {
      occupation: { type: "string", description: "Target occupation" },
      region: { type: "string", description: "Optional: geographic area" },
      budget_constraint: {
        type: "string",
        enum: ["free_only", "under_5k", "under_20k", "no_limit"],
        description: "Budget constraint"
      }
    },
    required: ["occupation"]
  }
};

export const relatedCareers: Anthropic.Tool = {
  name: "related_careers",
  description: "Returns related occupations with O*NET similarity scores. For suggesting alternatives and adjacent paths.",
  input_schema: {
    type: "object" as const,
    properties: {
      occupation: { type: "string", description: "Target occupation" },
      max_results: { type: "integer", description: "Number of results (default 5)" }
    },
    required: ["occupation"]
  }
};
```

---

## Tool Handler Implementation

```typescript
// In /lib/pathfinder/tools/onet.ts

// These handlers are called when Claude invokes tools during curriculum generation.
// They make real API calls to O*NET Web Services.

const ONET_BASE = "https://services.onetcenter.org/ws";
const ONET_AUTH = Buffer.from(`${process.env.ONET_USERNAME}:${process.env.ONET_PASSWORD}`).toString("base64");

export async function handleOnetOccupationLookup(input: { occupation: string }) {
  const headers = { Authorization: `Basic ${ONET_AUTH}`, Accept: "application/json" };

  // Resolve occupation code if title was provided
  const code = input.occupation.match(/^\d{2}-\d{4}\.\d{2}$/)
    ? input.occupation
    : await resolveOnetCode(input.occupation, headers);

  // Fetch parallel: skills, knowledge, abilities, technology, activities
  const [skills, knowledge, abilities, tech, activities] = await Promise.all([
    fetch(`${ONET_BASE}/online/occupations/${code}/skills`, { headers }).then(r => r.json()),
    fetch(`${ONET_BASE}/online/occupations/${code}/knowledge`, { headers }).then(r => r.json()),
    fetch(`${ONET_BASE}/online/occupations/${code}/abilities`, { headers }).then(r => r.json()),
    fetch(`${ONET_BASE}/online/occupations/${code}/technology`, { headers }).then(r => r.json()),
    fetch(`${ONET_BASE}/online/occupations/${code}/detailed_work_activities`, { headers }).then(r => r.json()),
  ]);

  return { code, skills, knowledge, abilities, tech, activities };
}

async function resolveOnetCode(title: string, headers: Record<string, string>): Promise<string> {
  const res = await fetch(`${ONET_BASE}/online/search?keyword=${encodeURIComponent(title)}`, { headers });
  const data = await res.json();
  return data.occupation?.[0]?.code ?? title;
}
```

---

## Output Schema

```typescript
// In /lib/pathfinder/schemas/learning-path.ts

export interface LearningPathOutput {
  pathId: string;
  title: string;
  audienceType: "discover" | "launch" | "accelerate" | "pivot";
  careerTarget: {
    title: string;
    onetCode: string;
    blsSummary: {
      medianSalary: number;
      jobOutlook: string;
      growthRate: string;
      entryEducation: string;
    };
  };
  learnerProfile: {
    audienceType: string;
    hollandCode: string;
    topValues: string[];
    currentSkills: string[];
    constraints: {
      budget: string;
      timeline: string;
      geographic: string;
      hoursPerWeek: number;
    };
  };
  skillDomains: SkillDomain[];
  phases: Phase[];
  capstoneProject: Project;
  educationPathways: EducationOption[];
  relatedCareers: RelatedCareer[];
  metadata: {
    generatedAt: string;
    totalModules: number;
    totalEstimatedHours: number;
    totalDurationWeeks: number;
  };
}

export interface SkillDomain {
  id: string;
  name: string;
  onetSkills: string[];
  prerequisiteDomains: string[];
  bloomPhase: "foundation" | "core" | "applied" | "portfolio";
}

export interface Phase {
  id: string;
  title: string;
  bloomLevels: string;
  duration: string;
  modules: ModuleSpec[];
}

export interface ModuleSpec {
  id: string;
  number: number;
  title: string;
  skillDomain: string;
  bloomLevel: string;
  estimatedHours: number;
  lessonSpec: {
    objectives: string[];
    keyConcepts: string[];
    narrativePrompt: string;
    tryThisExercises: string[];
  };
  videoPlaylistSpec: {
    searchQueries: string[];
    minVideos: number;
    maxDuration: string;
    qualityFilters: string[];
  };
  articleSpec: {
    searchQueries: string[];
    sources: string[];
    count: number;
  };
  assessmentSpec: {
    quizQuestions: number;
    bloomLevel: string;
    questionTypes: ("recall" | "scenario" | "application")[];
    scenarioContext: string;
  };
  projectSpec: {
    title: string;
    brief: string;
    deliverables: string[];
    skillsDemonstrated: string[];
    bloomLevel: string;
    isPortfolioArtifact: boolean;
    estimatedHours: number;
  };
  spacedReviewItems: {
    concept: string;
    reviewPrompt: string;
    intervals: number[];
  }[];
}

export interface Project {
  title: string;
  brief: string;
  deliverables: string[];
  skillsDemonstrated: string[];
  estimatedHours: number;
  evaluationCriteria: string[];
}

export interface EducationOption {
  type: "degree" | "certification" | "apprenticeship" | "bootcamp" | "military" | "self-directed";
  title: string;
  provider: string;
  duration: string;
  cost: string;
  roiEstimate: string;
}

export interface RelatedCareer {
  title: string;
  onetCode: string;
  similarityScore: number;
  whyRelated: string;
}
```

---

## Downstream Agent Prompt Specs

### Lesson Writer (receives ModuleSpec.lessonSpec)

```
You are a lesson writer for PathFinder. You receive a lesson specification and write narrative instructional content (1500-2500 words).

VOICE: Write as a working professional explaining to someone who's interested but new. Not a textbook. Not a chatbot. A mentor who's been there.

STRUCTURE per section:
- Open with a relatable analogy or real-world connection
- Explain the core concept clearly
- Include one "Try this now" micro-exercise (something they can do in 60 seconds)
- Connect to the next concept

RULES:
- No generic explanations. Ground everything in the specific occupation's context.
- Bold key terms on first use only.
- Use second person ("you") throughout.
- Include at least one "the reason this matters in the real world is..." moment per section.
```

### Resource Curator (receives videoPlaylistSpec + articleSpec)

```
You are a resource curator for PathFinder. You search for and rank the best free learning content for each module.

FOR YOUTUBE: Search using the provided queries. Return 3-5 videos ranked by:
1. Relevance to the specific O*NET skill (not just general topic)
2. Production quality (clear audio, professional presentation)
3. Recency (prefer last 2 years)
4. Instructor credibility (working professionals > hobbyists)

FOR ARTICLES: Search using provided queries and preferred sources. Return 2-3 articles. Prefer trade publications and practitioner content over academic papers.

FILTER OUT: Videos under 3 min (too shallow), videos over 30 min (too long for a module), content behind paywalls, AI-generated content farms, outdated information.
```

### News Agent (receives career target + skill domains)

```
You are a news agent for PathFinder. You search for current industry trends related to a career target.

RETURN 3-5 news items from the last 30 days. For each:
- Headline and source
- 2-sentence summary
- "Why this matters for you" — one sentence connecting this news to the learner's journey

PREFER: Trade publications, industry reports, government labor data releases.
AVOID: Opinion pieces, listicles, content marketing disguised as news.
```

### Assessment Designer (receives assessmentSpec + projectSpec)

```
You are an assessment designer for PathFinder. You create quizzes and project briefs.

FOR QUIZZES:
- Write scenario-based questions with real-world context
- Each question must match the declared Bloom's level
- Include explanation for correct answer (shown after submission)
- No trick questions. Test understanding, not memorization.

FOR PROJECTS:
- Every project must produce a tangible artifact (a file, recording, document, design, code)
- Include specific deliverables list
- Include skills demonstrated (mapped to O*NET)
- Include estimated time
- "Answer these questions" is NEVER a project. "Build this thing and reflect" is.
```

---

*Curriculum Architect Spec v2.0 — March 2026*
*Integrated with PathFinder custom orchestration layer.*
