import { useState } from "react";

const MODULE_DATA = {
  path: "Become a Sound Engineer",
  phase: "Phase 1: Foundations",
  module: 3,
  totalModules: 12,
  title: "Signal Flow & Gain Staging",
  duration: "Week 2",
  bloomLevel: "Understand → Apply",
  skillDomain: "Audio Signal Processing",
  onetCode: "27-4014.00",
  xp: 150,
  completed: false,
};

const LESSON_SECTIONS = [
  {
    title: "What is signal flow?",
    content: `Imagine you're standing at a river's source, watching water move downstream. It flows through channels, over rocks, through filters — and at every point, something shapes it. Signal flow in audio works the same way. It's the path your sound takes from the moment it enters a microphone to the moment it reaches a speaker or recording medium.

Every piece of equipment in that chain — microphone, preamp, EQ, compressor, mixer, converter, monitor — is a stop along the river. Understanding this chain isn't just technical knowledge. It's the foundation of every mixing decision you'll ever make. When something sounds wrong, signal flow is how you diagnose it. When something sounds right, signal flow is how you replicate it.`,
    tryThis: "Look at any device with audio output near you — your phone, laptop, or TV. Trace the signal path: where does the sound originate (app/file), what processes it (DAC, amplifier), and where does it exit (speaker)? You just mapped a signal flow.",
  },
  {
    title: "The standard signal chain",
    content: `In a professional recording studio, signal typically flows through these stages:

**Source → Microphone → Preamp → EQ → Dynamics (Compressor) → Mix Bus → Master Bus → Converter → Monitoring**

Each stage has a job. The microphone converts acoustic energy to electrical signal. The preamp boosts that signal to a usable level. EQ shapes the frequency content. The compressor controls dynamic range. The mix bus combines multiple signals. The master bus processes the final stereo output. The converter translates analog to digital (or vice versa). Monitors let you hear the result.

Here's what separates professionals from amateurs: professionals understand that every one of these stages can introduce noise, distortion, or coloration. They manage each stage intentionally. Amateurs just plug things in and hope it sounds good.`,
    tryThis: "Open any DAW (GarageBand is free on Mac, Audacity is free everywhere). Create an audio track, record 10 seconds of your voice, and look at the channel strip. Can you identify the gain/volume, EQ, and panning controls? Those are three stages of your signal flow right in front of you.",
  },
  {
    title: "Gain staging: why levels matter at every point",
    content: `Gain staging is the practice of managing signal level at every point in the chain. Too little gain and your signal drowns in noise. Too much and it distorts. The sweet spot is different at every stage.

Think of it like water pressure in pipes. Too little pressure and nothing comes out the faucet. Too much and the pipes burst. Every junction — every T-fitting, every valve — is a point where you can adjust pressure. In audio, every knob, fader, and plugin input is that junction.

The rule of thumb in digital audio: aim for signal peaks around -18 dBFS to -12 dBFS at each stage. This gives you headroom (room before distortion) while keeping the signal well above the noise floor. In analog gear, the equivalent target is 0 VU, which was designed to be the optimal operating level for tape machines.

Modern DAWs have 32-bit floating point processing, which means you technically can't clip inside the software. But that doesn't mean gain staging doesn't matter — plugins are often modeled after analog gear and respond differently at different input levels. A compressor plugin hit with -6 dBFS will behave differently than one hit with -24 dBFS, even if neither clips.`,
    tryThis: "In your DAW, record a voice clip. Look at the meter — where do your peaks land? Now add gain until the meter clips (goes red). Listen to the distortion. Now pull the gain back until peaks sit around -12 dBFS. That's your target zone. You just practiced gain staging.",
  },
];

const VIDEOS = [
  { title: "Audio Signal Flow Explained in 8 Minutes", channel: "Produce Like A Pro", views: "892K", duration: "8:14", relevance: 98 },
  { title: "Gain Staging Made Simple — The Only Guide You Need", channel: "In The Mix", views: "1.2M", duration: "11:22", relevance: 95 },
  { title: "Studio Signal Flow for Beginners", channel: "Recording Revolution", views: "445K", duration: "6:47", relevance: 92 },
  { title: "Why Gain Staging Actually Matters in 2025", channel: "Dan Worrall", views: "328K", duration: "14:33", relevance: 89 },
];

const NEWS = [
  { title: "Dolby Atmos Studios Grew 40% in 2025 — What It Means for Entry-Level Engineers", source: "Mix Magazine", date: "Mar 2026", tag: "Industry Growth" },
  { title: "AI-Assisted Mixing Tools Are Changing Workflows, Not Replacing Engineers", source: "Sound on Sound", date: "Feb 2026", tag: "Technology" },
  { title: "Live Event Audio Jobs Rebound to Pre-Pandemic Levels", source: "ProSoundWeb", date: "Mar 2026", tag: "Job Market" },
];

const QUIZ = [
  {
    q: "A vocalist's recording sounds noisy and thin. Which is the MOST likely gain staging issue?",
    options: ["Preamp gain set too low", "Monitor volume too high", "EQ boost at 10kHz", "Compressor ratio too high"],
    correct: 0,
    explanation: "Low preamp gain means the signal is close to the noise floor. When you boost it later in the chain, you amplify the noise along with the signal — resulting in a thin, noisy recording."
  },
  {
    q: "In a digital DAW with 32-bit floating point processing, why does gain staging still matter?",
    options: [
      "The DAW will crash if levels are too high",
      "Plugins modeled after analog gear respond differently at different input levels",
      "Digital audio cannot process signals above 0 dBFS",
      "Monitors will distort regardless of software headroom"
    ],
    correct: 1,
    explanation: "While 32-bit float means you can't technically clip inside the DAW, many plugins are modeled after analog hardware that has a specific sweet spot. A compressor plugin behaves differently at -6 dBFS input versus -24 dBFS input."
  },
  {
    q: "What is the recommended peak level target for gain staging in digital audio?",
    options: ["0 dBFS", "-18 to -12 dBFS", "-3 dBFS", "-48 dBFS"],
    correct: 1,
    explanation: "Peaking around -18 to -12 dBFS gives you healthy headroom before clipping while keeping your signal well above the noise floor. This range also corresponds to the analog sweet spot of 0 VU."
  },
];

const PROJECT = {
  title: "Map and Record Your Own Signal Flow",
  brief: `Using any recording setup you have access to (phone, laptop mic, or studio), complete the following:

1. **Draw the signal flow diagram** — from sound source to final recorded file, identify every stage the signal passes through. Label each stage. (Hand-drawn or digital — either is fine.)

2. **Record three takes of the same audio** (your voice reading a paragraph):
   - Take 1: Gain set too low (intentionally quiet)
   - Take 2: Gain set too high (intentionally distorted)
   - Take 3: Gain set in the sweet spot (-18 to -12 dBFS peaks)

3. **Write a 200-word reflection** comparing the three takes. What do you hear differently? How does gain staging affect the quality and usability of the recording?

**Submit:** Your signal flow diagram, three audio files, and written reflection.`,
  skills: ["Signal flow mapping", "Gain staging", "Critical listening", "Technical documentation"],
  bloomLevel: "Apply + Analyze",
  portfolioArtifact: true,
};

const tabs = ["Lesson", "Videos", "News", "Quiz", "Project"];

export default function PathFinderModule() {
  const [activeTab, setActiveTab] = useState("Lesson");
  const [expandedSection, setExpandedSection] = useState(0);
  const [quizState, setQuizState] = useState({ current: 0, answers: {}, submitted: false });
  const [projectStarted, setProjectStarted] = useState(false);

  const handleQuizAnswer = (qIdx, aIdx) => {
    if (quizState.submitted) return;
    setQuizState(prev => ({ ...prev, answers: { ...prev.answers, [qIdx]: aIdx } }));
  };

  const submitQuiz = () => setQuizState(prev => ({ ...prev, submitted: true }));

  const quizScore = Object.keys(quizState.answers).filter(
    k => quizState.answers[k] === QUIZ[k].correct
  ).length;

  return (
    <div className="max-w-3xl mx-auto p-4 font-sans">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded text-xs font-medium">{MODULE_DATA.path}</span>
          <span>›</span>
          <span>{MODULE_DATA.phase}</span>
          <span>›</span>
          <span>Module {MODULE_DATA.module}/{MODULE_DATA.totalModules}</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{MODULE_DATA.title}</h1>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="bg-gray-100 px-2 py-1 rounded">{MODULE_DATA.duration}</span>
          <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">Bloom's: {MODULE_DATA.bloomLevel}</span>
          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">O*NET: {MODULE_DATA.skillDomain}</span>
          <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded">{MODULE_DATA.xp} XP</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Module progress</span>
          <span>0/5 components</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: "0%" }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
            {tab === "Quiz" && quizState.submitted && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded ${quizScore === QUIZ.length ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {quizScore}/{QUIZ.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lesson Tab */}
      {activeTab === "Lesson" && (
        <div className="space-y-4">
          {LESSON_SECTIONS.map((section, i) => (
            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === i ? -1 : i)}
                className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-medium">{i + 1}</span>
                  <span className="font-medium text-gray-900">{section.title}</span>
                </div>
                <span className="text-gray-400 text-lg">{expandedSection === i ? "−" : "+"}</span>
              </button>
              {expandedSection === i && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="prose prose-sm max-w-none mt-3 text-gray-700 leading-relaxed whitespace-pre-line">
                    {section.content}
                  </div>
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="text-xs font-medium text-amber-800 mb-1">Try this now</div>
                    <div className="text-sm text-amber-900">{section.tryThis}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Spaced review scheduled</div>
            <div className="text-sm text-gray-700">Key concepts from this module will resurface for review in <strong>3 days</strong>, <strong>7 days</strong>, and <strong>21 days</strong>.</div>
          </div>
        </div>
      )}

      {/* Videos Tab */}
      {activeTab === "Videos" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-4">Curated from YouTube — ranked by relevance to O*NET skill requirements for this module.</p>
          {VIDEOS.map((v, i) => (
            <div key={i} className="flex gap-4 p-4 border border-gray-200 rounded-xl hover:border-teal-300 transition cursor-pointer">
              <div className="w-32 h-20 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl text-gray-400">▶</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm mb-1">{v.title}</div>
                <div className="text-xs text-gray-500 mb-2">{v.channel} · {v.views} views · {v.duration}</div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${v.relevance}%` }} />
                  </div>
                  <span className="text-xs text-teal-700">{v.relevance}% relevance</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* News Tab */}
      {activeTab === "News" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-4">Live industry news — why what you're learning matters right now.</p>
          {NEWS.map((n, i) => (
            <div key={i} className="p-4 border border-gray-200 rounded-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-gray-900 text-sm mb-1">{n.title}</div>
                  <div className="text-xs text-gray-500">{n.source} · {n.date}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                  n.tag === "Industry Growth" ? "bg-green-50 text-green-700" :
                  n.tag === "Technology" ? "bg-purple-50 text-purple-700" :
                  "bg-blue-50 text-blue-700"
                }`}>{n.tag}</span>
              </div>
            </div>
          ))}
          <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
            <div className="text-xs font-medium text-teal-800 mb-1">Why this matters for you</div>
            <div className="text-sm text-teal-900">The growth in Dolby Atmos studios means more entry-level positions in immersive audio — a field where signal flow knowledge is even more critical because you're managing many more channels simultaneously.</div>
          </div>
        </div>
      )}

      {/* Quiz Tab */}
      {activeTab === "Quiz" && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">Scenario-based questions testing understanding and application — not memorization.</p>
          {QUIZ.map((q, qi) => (
            <div key={qi} className="border border-gray-200 rounded-xl p-4">
              <div className="text-sm font-medium text-gray-900 mb-3">{qi + 1}. {q.q}</div>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = quizState.answers[qi] === oi;
                  const isCorrect = oi === q.correct;
                  const showResult = quizState.submitted;
                  return (
                    <button
                      key={oi}
                      onClick={() => handleQuizAnswer(qi, oi)}
                      className={`w-full text-left p-3 rounded-lg text-sm border transition ${
                        showResult && isCorrect ? "border-green-400 bg-green-50 text-green-900" :
                        showResult && selected && !isCorrect ? "border-red-300 bg-red-50 text-red-900" :
                        selected ? "border-teal-400 bg-teal-50 text-teal-900" :
                        "border-gray-200 hover:border-gray-300 text-gray-700"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {quizState.submitted && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${
                  quizState.answers[qi] === q.correct ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"
                }`}>
                  {q.explanation}
                </div>
              )}
            </div>
          ))}
          {!quizState.submitted && Object.keys(quizState.answers).length === QUIZ.length && (
            <button onClick={submitQuiz} className="w-full py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition">
              Submit answers
            </button>
          )}
          {quizState.submitted && (
            <div className="bg-gray-50 rounded-xl p-4 text-center border">
              <div className="text-2xl font-semibold text-gray-900 mb-1">{quizScore}/{QUIZ.length}</div>
              <div className="text-sm text-gray-500">
                {quizScore === QUIZ.length ? "Perfect — you've got a solid grasp of signal flow." :
                 quizScore >= 2 ? "Good foundation. Review the explanation for the one you missed." :
                 "Worth revisiting the lesson before moving on. No rush."}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Project Tab */}
      {activeTab === "Project" && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-purple-200 text-purple-800 text-xs px-2 py-0.5 rounded font-medium">Capstone project</span>
              <span className="bg-purple-200 text-purple-800 text-xs px-2 py-0.5 rounded font-medium">Portfolio artifact</span>
              <span className="bg-purple-200 text-purple-800 text-xs px-2 py-0.5 rounded font-medium">Bloom's: {PROJECT.bloomLevel}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{PROJECT.title}</h3>
            <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{PROJECT.brief}</div>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="text-xs font-medium text-gray-500 mb-2">Skills demonstrated</div>
            <div className="flex flex-wrap gap-2">
              {PROJECT.skills.map(s => (
                <span key={s} className="bg-teal-50 text-teal-700 text-xs px-2 py-1 rounded">{s}</span>
              ))}
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="text-xs font-medium text-green-800 mb-1">This goes in your portfolio</div>
            <div className="text-sm text-green-900">Your signal flow diagram, audio recordings, and reflection become portfolio artifacts — tangible evidence of your skills that you can show to future employers or programs.</div>
          </div>
          {!projectStarted ? (
            <button onClick={() => setProjectStarted(true)} className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition">
              Start project
            </button>
          ) : (
            <div className="border-2 border-dashed border-purple-300 rounded-xl p-6 text-center">
              <div className="text-sm text-purple-700 font-medium mb-1">Project in progress</div>
              <div className="text-xs text-gray-500">Upload your signal flow diagram, three audio files, and written reflection when ready.</div>
              <button className="mt-3 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition">
                Upload submission
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
