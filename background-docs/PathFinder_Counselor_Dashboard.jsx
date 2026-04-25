import { useState } from "react";

const STUDENTS = [
  { id: 1, name: "Maya Johnson", grade: "11th", path: "UX Design", type: "Discover", progress: 85, streak: 12, status: "active", lastActive: "2h ago", riskFlag: null, quizAvg: 88 },
  { id: 2, name: "DeShawn Williams", grade: "12th", path: "Sound Engineering", type: "Launch", progress: 62, streak: 7, status: "active", lastActive: "1d ago", riskFlag: null, quizAvg: 76 },
  { id: 3, name: "Aaliyah Roberts", grade: "11th", path: "Nursing", type: "Discover", progress: 34, streak: 0, status: "stalled", lastActive: "9d ago", riskFlag: "No activity 9 days", quizAvg: 65 },
  { id: 4, name: "Marcus Chen", grade: "12th", path: "Software Development", type: "Launch", progress: 100, streak: 21, status: "completed", lastActive: "4h ago", riskFlag: null, quizAvg: 94 },
  { id: 5, name: "Zara Thompson", grade: "11th", path: "Not assigned", type: null, progress: 0, streak: 0, status: "new", lastActive: "Never", riskFlag: "Needs assessment", quizAvg: null },
  { id: 6, name: "Jordan Mitchell", grade: "12th", path: "Graphic Design", type: "Launch", progress: 48, streak: 3, status: "active", lastActive: "5h ago", riskFlag: "Quiz scores declining", quizAvg: 58 },
  { id: 7, name: "Kenji Alvarez", grade: "11th", path: "Cybersecurity", type: "Discover", progress: 71, streak: 15, status: "active", lastActive: "3h ago", riskFlag: null, quizAvg: 82 },
  { id: 8, name: "Imani Davis", grade: "12th", path: "Physical Therapy", type: "Launch", progress: 29, streak: 1, status: "at-risk", lastActive: "6d ago", riskFlag: "Expressed uncertainty in chat", quizAvg: 71 },
];

const ALERTS = [
  { type: "stalled", student: "Aaliyah Roberts", message: "No activity for 9 days. Was on track with Nursing path.", action: "Schedule check-in" },
  { type: "at-risk", student: "Imani Davis", message: "Told the AI counselor: \"I don't think PT is right for me anymore.\" May need a pivot conversation.", action: "Reach out" },
  { type: "declining", student: "Jordan Mitchell", message: "Quiz scores dropped from 78% to 52% over last 3 modules. May be struggling with design theory section.", action: "Review progress" },
  { type: "deadline", student: "DeShawn Williams", message: "College application deadline for audio engineering programs in 23 days. Has not started personal statement.", action: "Assign doc builder" },
  { type: "celebrate", student: "Marcus Chen", message: "Completed full Software Development Launch path with 94% quiz average and all portfolio projects submitted.", action: "Certificate ready" },
];

const COHORT_STATS = {
  total: 8,
  active: 4,
  stalled: 1,
  atRisk: 1,
  completed: 1,
  new: 1,
  avgProgress: 54,
  avgStreak: 7.4,
  topPaths: ["Software Development", "Sound Engineering", "UX Design", "Nursing"],
  weeklyActive: 6,
};

const statusColors = {
  active: { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
  stalled: { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  "at-risk": { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500" },
  completed: { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  new: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
};

const alertColors = {
  stalled: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-800" },
  "at-risk": { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-800" },
  declining: { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-800" },
  deadline: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-800" },
  celebrate: { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-800" },
};

export default function CounselorDashboard() {
  const [view, setView] = useState("overview");
  const [filter, setFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const filtered = filter === "all" ? STUDENTS : STUDENTS.filter(s => s.status === filter);
  const alertsNeedingAction = ALERTS.filter(a => a.type !== "celebrate");

  return (
    <div className="max-w-4xl mx-auto p-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">PathFinder — Counselor Dashboard</h1>
          <p className="text-sm text-gray-500">Mrs. Thompson · Jefferson High School · 11th & 12th Grade Cohort</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("overview")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${view === "overview" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"}`}>Overview</button>
          <button onClick={() => setView("students")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${view === "students" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"}`}>Students</button>
          <button onClick={() => setView("alerts")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition relative ${view === "alerts" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"}`}>
            Alerts
            {alertsNeedingAction.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{alertsNeedingAction.length}</span>}
          </button>
        </div>
      </div>

      {/* Overview */}
      {view === "overview" && (
        <div className="space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Active", value: COHORT_STATS.active, color: "text-green-700", bg: "bg-green-50" },
              { label: "Stalled", value: COHORT_STATS.stalled, color: "text-amber-700", bg: "bg-amber-50" },
              { label: "At-risk", value: COHORT_STATS.atRisk, color: "text-red-700", bg: "bg-red-50" },
              { label: "Completed", value: COHORT_STATS.completed, color: "text-blue-700", bg: "bg-blue-50" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-gray-200`}>
                <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Aggregate metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Avg. path progress</div>
              <div className="flex items-center gap-3">
                <div className="text-xl font-semibold text-gray-900">{COHORT_STATS.avgProgress}%</div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${COHORT_STATS.avgProgress}%` }} />
                </div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Avg. streak</div>
              <div className="text-xl font-semibold text-gray-900">{COHORT_STATS.avgStreak} days</div>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Active this week</div>
              <div className="text-xl font-semibold text-gray-900">{COHORT_STATS.weeklyActive}/{COHORT_STATS.total}</div>
            </div>
          </div>

          {/* Top paths */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-2">Trending career paths in this cohort</div>
            <div className="flex flex-wrap gap-2">
              {COHORT_STATS.topPaths.map((p, i) => (
                <span key={p} className="bg-teal-50 text-teal-700 px-3 py-1 rounded-lg text-sm">
                  {i + 1}. {p}
                </span>
              ))}
            </div>
          </div>

          {/* Quick alerts preview */}
          {alertsNeedingAction.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-800">{alertsNeedingAction.length} students need attention</span>
                <button onClick={() => setView("alerts")} className="text-xs text-red-700 underline">View all</button>
              </div>
              <div className="space-y-1">
                {alertsNeedingAction.slice(0, 2).map((a, i) => (
                  <div key={i} className="text-sm text-red-900">{a.student}: {a.message.slice(0, 60)}...</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Students List */}
      {view === "students" && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {["all", "active", "stalled", "at-risk", "completed", "new"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${
                  filter === f ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f} {f !== "all" && `(${STUDENTS.filter(s => s.status === f).length})`}
              </button>
            ))}
          </div>

          {/* Student cards */}
          {filtered.map(s => (
            <div
              key={s.id}
              onClick={() => setSelectedStudent(selectedStudent === s.id ? null : s.id)}
              className={`border rounded-xl p-4 cursor-pointer transition ${
                selectedStudent === s.id ? "border-teal-400 bg-teal-50/30" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusColors[s.status].dot}`} />
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.grade} · {s.path}{s.type ? ` (${s.type})` : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.riskFlag && (
                    <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded font-medium">{s.riskFlag}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColors[s.status].bg} ${statusColors[s.status].text}`}>{s.status}</span>
                </div>
              </div>

              {selectedStudent === s.id && s.status !== "new" && (
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="text-xs text-gray-500">Progress</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${s.progress}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-700">{s.progress}%</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Streak</div>
                    <div className="text-sm font-medium text-gray-900 mt-1">{s.streak} days</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Quiz avg</div>
                    <div className={`text-sm font-medium mt-1 ${s.quizAvg >= 80 ? "text-green-700" : s.quizAvg >= 60 ? "text-amber-700" : "text-red-700"}`}>{s.quizAvg}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Last active</div>
                    <div className="text-sm text-gray-900 mt-1">{s.lastActive}</div>
                  </div>
                  <div className="col-span-2 sm:col-span-4 flex gap-2 mt-1">
                    <button className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-xs font-medium hover:bg-teal-200 transition">View full path</button>
                    <button className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition">Send message</button>
                    <button className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition">Reassign path</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {view === "alerts" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-4">AI-generated alerts based on student engagement patterns, chat sentiment, and upcoming deadlines.</p>
          {ALERTS.map((a, i) => {
            const c = alertColors[a.type];
            return (
              <div key={i} className={`${c.bg} border ${c.border} rounded-xl p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium capitalize ${c.badge}`}>{a.type}</span>
                      <span className="text-sm font-medium text-gray-900">{a.student}</span>
                    </div>
                    <div className="text-sm text-gray-700">{a.message}</div>
                  </div>
                  <button className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                    a.type === "celebrate" ? "bg-green-200 text-green-800" : "bg-white text-gray-700 border border-gray-300"
                  } hover:opacity-80 transition`}>
                    {a.action}
                  </button>
                </div>
              </div>
            );
          })}

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-4">
            <div className="text-xs font-medium text-gray-500 mb-1">How alerts work</div>
            <div className="text-sm text-gray-600">PathFinder monitors engagement patterns, quiz performance trends, chat sentiment, and external deadlines. Alerts are prioritized so you focus on students who need you most. The AI handles the 80% — you handle the 20% that requires human judgment.</div>
          </div>
        </div>
      )}
    </div>
  );
}
