# PathFinder: A Career Bridge for the Moment Black Workers Are Living In

PathFinder is an AI career-bridge generator. This document explains who it's actually for, why the moment we're in calls for it specifically, and how the product's design decisions trace back to the lived reality of Black workers, especially Black women, in 2026.

SLIDES.md is the elevator version of the pitch. This is the long version. It's the research foundation for why we built what we built, in the way we built it, for Blackathon.

---

## The moment

Two displacements are converging on Black workers right now. They arrive at the same household at the same time, and they compound.

### DOGE and the federal workforce

Federal employment has been a primary engine of Black middle-class formation since the post-Great Society civil-service reforms of the 1960s and 70s. Equal-protection hiring rules, structured pay scales, and union-backed protections made federal jobs one of the few reliable pathways into stable middle-class income for Black families, especially Black women.

The numbers reflect that history. Black workers make up roughly 18 percent of the federal civilian workforce, against about 13 percent of the overall U.S. labor force. Black women specifically are overrepresented at a higher rate than any other demographic split: by some accounts they hold 12 to 14 percent of federal positions, against roughly 6 to 7 percent of the general workforce (sources: U.S. Office of Personnel Management workforce data; Joint Center for Political and Economic Studies analyses).

When the Department of Government Efficiency began aggressive workforce reductions in 2025, the population it cut into was disproportionately Black. The Joint Center, Brookings, and Pew have each documented the same pattern: a generational rollback of one of the few reliable middle-class pipelines this community has historically had access to.

This isn't an abstract statistic. It's a 47-year-old GS-9 records administrator at a regional HHS office in Maryland, with 18 years of service and a kid in college, getting walked out with severance and no playbook for what comes next.

### AI and the bottom of the white-collar ladder

At the same time, the occupations most exposed to generative-AI displacement are occupations where Black workers, and Black women in particular, are concentrated. Customer-service representatives. Administrative assistants. Claims processors. Eligibility specialists. Records and information clerks. Medical billing and coding. Transcription. Data entry.

Goldman Sachs Global Investment Research, McKinsey's *Generative AI and the future of work in America*, and the Brookings AI initiative have each published projections in the past 18 months estimating that 25 to 40 percent of the task families inside these roles are automatable with current LLM technology. BLS occupational data and Pew analyses of AI exposure consistently show these same task families have higher Black workforce representation than the U.S. labor force average.

So the same population losing federal jobs to DOGE is, on a parallel track, losing private-sector administrative jobs to automation. The roles that historically absorbed Black workers displaced from one sector are themselves contracting.

The career-change question is not optional anymore. The question is to what.

---

## Why existing career-change tools fail this audience

Read the standard career-change advice, listen to the standard career-change podcast, and the implicit assumptions stack up fast:

- You have 6 to 12 months of financial runway.
- You can afford a $10K to $20K bootcamp, or an MBA.
- Your network includes people in the destination industry.
- You can relocate to a tech hub.
- You attended a name-brand school.
- A failed pivot has limited downside.

For most Black workers, especially Black women breadwinners, none of those assumptions hold.

**The wealth gap makes the math different.** The Federal Reserve's most recent Survey of Consumer Finances shows median white household wealth at roughly $285,000 against Black household wealth of about $45,000. That ~6x gap isn't a moral judgment, it's a structural reality. It means the cost of a failed career change is higher. It means "follow your passion" advice that ignores income stability is, for this population, actively dangerous. The cushion that lets a white middle-class professional take a year off to reskill simply isn't there.

**The cost stack of existing tools is built for the 90th percentile.** Coursera Plus and LinkedIn Premium together run about $60 a month. Reforge, Maven, and On Deck cohort programs run $1,500 to $3,000 per program. A bootcamp tier runs $10K to $20K. The aggressive end of "AI career advisor" platforms charge $200 to $400 per session. None of those numbers fit a budget already absorbing the loss of a federal salary.

**Hiring discrimination still exists, and the math has to account for it.** The original Bertrand and Mullainathan resume-callback study from 2003 ("Are Emily and Greg More Employable Than Lakisha and Jamal?") has been replicated repeatedly, with the most recent large-scale audit studies in 2023 and 2024 producing similar results: identical resumes with stereotypically Black versus white names produce roughly 30 percent fewer callbacks for the Black-named applicants. That gap means "build a portfolio and apply broadly" advice produces fewer interview slots per application for Black candidates than for white ones. A career-change calculator that doesn't account for this gap is selling a different product to a different person.

**Network gaps are real.** Roughly 70 to 80 percent of jobs are filled through professional networks (LinkedIn workforce reports). For workers without dense connections in tech, finance, or product roles, "just network your way in" is genuine advice that requires capital they don't have.

The composite picture: existing tools assume conditions that don't hold for the audience that needs career-change support most urgently right now.

---

## Who PathFinder is actually for

Concrete personas, grounded in the data above:

**Renée, 47, federal records administrator, Maryland.** Black woman. 18 years at a regional HHS office, GS-9 step 7. Two kids, one in college. Husband in seasonal construction. Six months severance after the 2025 RIF. Has never worked outside government. Doesn't know what "product manager" means and assumes it's not for her. Career-change tools that ask her to "build a portfolio" feel like they're written in a different language.

**Tasha, 34, customer-service team lead, Birmingham.** Black woman. Eight years at a regional insurance back-office. Watched her team go from 22 people to 11 over three years. Layoffs called "natural attrition." She knows it's automation. Promoted twice but plateaued at $58K. Asking herself what's next that doesn't disappear in three years. She's the primary earner in her household.

**Marcus, 23, Howard '25, BA in communications, working retail.** Black man. Graduated into a frozen hiring market in PR and marketing comms because of AI tooling. Student debt. No connections in his target industries. Generic career advice ("build a personal brand") doesn't translate to "what do I do tomorrow morning."

**Jerome, 31, FedEx ground operations supervisor, Atlanta.** Black man. Ten years in the same company. First-generation college graduate. Asking whether "transition to tech" is realistic at his age, his background, his city. Doesn't trust the people who tell him it is, and doesn't trust the people who tell him it isn't.

PathFinder is for these four. Every product decision below traces back to constraints these four people actually live with.

---

## How the product reflects this audience

| Constraint | Product decision |
|---|---|
| No $10K bootcamp budget | Free, anonymous, no signup required. One click to save your progress when you're ready. |
| Limited time to research | 60-second multi-agent path generation. The tool meets you between calls, on a lunch break. |
| Cost of failure is structurally higher | Honest salary math anchored on YOUR pay, not the median. Including cuts. If the target career pays $30K less, we say so in dollars. |
| "Follow your passion" is structurally harmful | Counselor system prompt explicitly forbids cheerleading. Calibrated honesty: "9 months realistic, 12 honest at 4 hours per week." |
| Phone is the primary device for many users | Mobile-first responsive layout. Counselor works on a phone. |
| Limited time before next paycheck panic | 8-week realistic timelines, not 2-year masters degrees. |
| Network gap | Counselor surfaces specific people to follow on LinkedIn, communities to join, free or low-cost places to start before any credentials get bought. |
| Discrimination in hiring | We surface roles where evaluation is increasingly portfolio-based or data-based, where the resume bias has more counter-pressure. |
| Distrust of black-box AI | Live multi-agent pipeline shows every step, every model, every source. No "trust us, the AI figured it out." |
| Government data is the most trusted source | O*NET grounding, BLS salary data, Perplexity Sonar with citations for live web data. Never invented numbers. |
| Privacy matters when you're job-hunting from a shared computer | Anonymous-first auth. The session lives in this browser only until you choose to save it. |

These aren't generic features. They're specific responses to friction points this population actually reports.

---

## What changes when the audience comes into focus

The product roadmap shifts when you center this user.

**HBCU career-center partnerships.** Howard, Spelman, Morehouse, Hampton, North Carolina Central, Florida A&M, Tuskegee, Clark Atlanta. Career centers at HBCUs serve roughly 50,000 graduating seniors a year, plus alumni. Most are systematically under-resourced compared to PWI counterparts and are actively looking for AI-era career tooling that respects student constraints. PathFinder slot-fits.

**Urban League and National Coalition of 100 Black Women chapter rollouts.** Both organizations run workforce-development programming and are looking for tools that don't require enterprise budgets to deploy.

**State workforce development offices in DOGE-affected states.** Maryland, Virginia, DC, Georgia, Illinois have the highest concentrations of displaced federal workers. State workforce dev offices are funded to serve this population and are looking for tooling at scale that costs hundreds of dollars per user, not thousands.

**Federal outplacement contracts.** When DOGE layoffs trigger contractual outplacement obligations, the firms that hold those contracts need a delivery mechanism that doesn't cost $400 an hour per career counselor. PathFinder's per-path cost is roughly $0.50 to $1.50 in API expenses. The unit economics fit a public-procurement budget.

**Premium tier with culturally competent human counselors.** The hardest part of career advice for Black workers is finding counselors who understand the discrimination math, the wealth math, the family-breadwinner math, the code-switching math. A premium tier matching users with culturally competent human counselors, scheduled through the platform, with the AI-built bridge already in the room when the meeting starts. That's the moat. The AI does the work that doesn't require lived experience. The human does the work that does.

**Mobile-native experience.** The current responsive layout works on a phone. A native mobile app pushes adoption further into communities that are mobile-first and don't sit at a laptop after work.

---

## Why this matters now

Two truths can hold at once.

The first: AI is going to keep automating the bottom of the white-collar ladder. That genie is not going back. The customer-service jobs, the records-admin jobs, the eligibility-clerk jobs, the basic data-entry jobs. They are not coming back even if the macroeconomy roars.

The second: the federal workforce is going to keep contracting under DOGE. That is policy, operating on a political clock that is slower than the clock on people's mortgage payments and their kids' tuition.

What happens between now and whenever those forces shift matters. A Black middle class that took six decades to build through federal employment cannot be allowed to fall in three. Career change at scale, with honest math and zero gatekeeping, is a partial answer. Not the whole answer. But a partial answer is better than no answer, and it's a thing we can actually ship.

PathFinder ships tonight. The roadmap above is what comes after.

---

## Sources and further reading

- U.S. Office of Personnel Management, *Federal Workforce Data*. Annual demographic reporting.
- Joint Center for Political and Economic Studies. Analyses of federal workforce demographics and DOGE impact (2025-2026).
- Brookings Institution. *AI and the future of work*; commentary on federal employment as a Black middle-class pipeline.
- Federal Reserve, *Survey of Consumer Finances*. Most recent (2022) racial wealth data.
- Bertrand and Mullainathan, *Are Emily and Greg More Employable Than Lakisha and Jamal? A Field Experiment on Labor Market Discrimination* (NBER, 2003). Replicated 2023 and 2024.
- McKinsey Global Institute, *Generative AI and the future of work in America* (2023, updates 2024-2025).
- Goldman Sachs Global Investment Research, *The potentially large effects of AI on economic growth and employment* (2023, updates 2024-2025).
- Pew Research Center. *Black workers in the federal workforce*; *AI exposure by demographic*.
- Bureau of Labor Statistics. *Labor Force Statistics from the Current Population Survey*; *Occupational Employment and Wage Statistics*.
- LinkedIn Workforce Reports. Network and hiring channel data.

---

## Closing

PathFinder does not fix structural inequality. It does not reverse DOGE, end hiring discrimination, or close the wealth gap. What it does is take one specific friction point, the moment a person who just lost their job sits down and tries to figure out what comes next, and removes the barriers that exist there.

For Blackathon, that's the contribution. A working tool, built with honest math, that meets a community at the moment it's actually living through.

That's the game.
