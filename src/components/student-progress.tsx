"use client";

import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import type { DBLesson, DBWeakness } from "@/types";

// ============================================================
// Student progress over time: understanding-score trend +
// weaknesses aggregated by topic across all of a student's lessons.
// Pure/derived — takes the same data the dashboard already fetches.
// ============================================================

interface ScorePoint {
  score: number;
  date: string;
}

interface TopicSummary {
  topic: string;
  count: number;
  avgConfidence: number;
}

function buildScoreSeries(lessons: DBLesson[]): ScorePoint[] {
  return lessons
    .filter((l) => l.understanding_score !== null)
    .map((l) => ({
      score: Number(l.understanding_score),
      date: l.created_at,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function aggregateTopics(weaknesses: DBWeakness[]): TopicSummary[] {
  const byTopic = new Map<string, { topic: string; confidences: number[] }>();
  for (const w of weaknesses) {
    const key = w.topic.trim().toLowerCase();
    if (!key) continue;
    const entry = byTopic.get(key) ?? { topic: w.topic.trim(), confidences: [] };
    entry.confidences.push(Number(w.confidence));
    byTopic.set(key, entry);
  }
  return Array.from(byTopic.values())
    .map((e) => ({
      topic: e.topic,
      count: e.confidences.length,
      avgConfidence:
        e.confidences.reduce((sum, c) => sum + c, 0) / e.confidences.length,
    }))
    .sort((a, b) => b.count - a.count || b.avgConfidence - a.avgConfidence);
}

function ScoreTrend({ series }: { series: ScorePoint[] }) {
  if (series.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        No understanding scores yet — they appear once a lesson finishes analysis.
      </p>
    );
  }

  const latest = series[series.length - 1].score;
  const first = series[0].score;
  const delta = Math.round(latest - first);

  // SVG line chart, score scaled 0..100 over the chart height.
  const W = 600;
  const H = 120;
  const PAD = 8;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const stepX = series.length > 1 ? innerW / (series.length - 1) : 0;
  const xy = (i: number, score: number) => {
    const x = PAD + (series.length > 1 ? i * stepX : innerW / 2);
    const y = PAD + innerH * (1 - score / 100);
    return { x, y };
  };
  const points = series.map((p, i) => xy(i, p.score));
  const linePath = points.map((p) => `${p.x},${p.y}`).join(" ");

  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor =
    delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-gray-400";

  return (
    <div>
      <div className="flex items-end gap-4 mb-3">
        <div>
          <p className="text-3xl font-bold text-blue-600">
            {Math.round(latest)}
            <span className="text-base text-gray-400">/100</span>
          </p>
          <p className="text-xs text-gray-500">Latest understanding score</p>
        </div>
        {series.length > 1 && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trendColor} pb-1`}>
            <TrendIcon className="w-4 h-4" />
            {delta > 0 ? "+" : ""}
            {delta} since first lesson
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-28"
        preserveAspectRatio="none"
        role="img"
        aria-label="Understanding score trend"
      >
        {/* gridlines at 25/50/75 */}
        {[25, 50, 75].map((g) => {
          const y = PAD + innerH * (1 - g / 100);
          return (
            <line
              key={g}
              x1={PAD}
              y1={y}
              x2={W - PAD}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth={1}
            />
          );
        })}
        {series.length > 1 && (
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={linePath}
          />
        )}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#2563eb" />
        ))}
      </svg>

      <div
        className={`flex text-[10px] text-gray-400 mt-1 ${
          series.length > 1 ? "justify-between" : "justify-center"
        }`}
      >
        <span>{new Date(series[0].date).toLocaleDateString()}</span>
        {series.length > 1 && (
          <span>{new Date(series[series.length - 1].date).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}

export default function StudentProgress({
  lessons,
  weaknesses,
}: {
  lessons: DBLesson[];
  weaknesses: DBWeakness[];
}) {
  const series = buildScoreSeries(lessons);
  const topics = aggregateTopics(weaknesses);
  const maxCount = topics.length > 0 ? topics[0].count : 1;

  return (
    <div className="space-y-6">
      {/* Score trend over time */}
      <div className="bg-white border rounded-lg p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          <TrendingUp className="w-4 h-4" /> Progress Over Time
        </h2>
        <ScoreTrend series={series} />
      </div>

      {/* Weaknesses aggregated by topic */}
      {topics.length > 0 && (
        <div className="bg-white border rounded-lg p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
            <AlertCircle className="w-4 h-4" /> Topics to Review
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            Aggregated across all lessons — how often each topic came up as a weakness.
          </p>
          <div className="space-y-2">
            {topics.slice(0, 12).map((t) => (
              <div key={t.topic} className="flex items-center gap-3">
                <div className="w-40 shrink-0 text-sm font-medium truncate" title={t.topic}>
                  {t.topic}
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div
                    className="bg-orange-500 h-2.5 rounded-full"
                    style={{ width: `${(t.count / maxCount) * 100}%` }}
                  />
                </div>
                <div className="shrink-0 text-xs text-gray-500 w-28 text-right">
                  {t.count}× · {(t.avgConfidence * 100).toFixed(0)}% conf
                </div>
              </div>
            ))}
            {topics.length > 12 && (
              <p className="text-xs text-gray-400 text-center mt-2">
                +{topics.length - 12} more topics
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
