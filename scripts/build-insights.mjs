import fs from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const data = JSON.parse(await fs.readFile(new URL("data/articles.json", ROOT), "utf8"));
const now = new Date();
const articles = Array.isArray(data.articles) ? data.articles : [];
const withinDays = (value, days) => {
  const date = new Date(value || "");
  return !Number.isNaN(date.getTime()) && now - date <= days * 24 * 60 * 60 * 1000;
};
const countBy = (values) => Object.entries(values).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja"));
const week = articles.filter((article) => withinDays(article.publishedAt, 7));
const today = articles.filter((article) => {
  const date = new Date(article.publishedAt || "");
  return !Number.isNaN(date.getTime()) && date.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" }) === now.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
});
const count = (list, selector) => list.reduce((counts, item) => {
  for (const key of selector(item)) counts[key] = (counts[key] || 0) + 1;
  return counts;
}, {});
const groups = count(week, (article) => article.groups || []);
const payload = {
  updatedAt: now.toISOString(),
  totals: { all: articles.length, today: today.length, week: week.length },
  groupRanking: countBy(groups).slice(0, 9),
  memberRanking: countBy(count(week, (article) => (article.memberMatches || []).map((member) => member.name))).slice(0, 10),
  sourceRanking: countBy(count(week, (article) => [article.sourceName || "ニュース"])).slice(0, 10),
  topics: countBy(groups).slice(0, 5),
  recentByGroup: Object.fromEntries(Object.keys(groups).map((group) => [group, articles.filter((article) => (article.groups || []).includes(group)).slice(0, 5)]))
};
await fs.writeFile(new URL("data/site-insights.json", ROOT), `${JSON.stringify(payload, null, 2)}\n`);
console.log("Saved data/site-insights.json");
