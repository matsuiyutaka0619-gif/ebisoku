const DEFAULT_CONFIG = {
  site: {
    siteName: "えびそく！",
    tagline: "EBiDANニュースを毎日さくっと追える速報まとめ",
    description: "EBiDAN関連ニュースをRSSから整理する速報まとめサイトです。",
    footerNote: "記事本文は転載せず、元記事へのリンクを掲載します。",
    searchPlaceholder: "キーワード・ニュース名で検索"
  },
  categories: {
    allLabel: "すべて",
    categories: [],
    statuses: [
      { id: "active", label: "現役" },
      { id: "og", label: "OG" }
    ],
    archiveLinks: []
  },
  theme: {
    brandColors: ["#812990", "#f19db5", "#7cc7e8"],
    background: "#ffffff",
    text: "#201826",
    mutedText: "#6f6574"
  },
  ads: {},
  ogp: {},
  operator: {}
};

const state = {
  articles: [],
  members: [],
  links: [],
  config: null,
  activeGroup: "all",
  activeStatus: "all",
  query: "",
  activeMember: new URLSearchParams(window.location.search).get("member") || ""
};

const pageConfig = {
  base: document.body.dataset.base || ".",
  page: document.body.dataset.page || "home",
  group: document.body.dataset.group || "",
  title: document.body.dataset.title || "最新ニュース",
  intro: document.body.dataset.intro || "EBiDAN関連ニュースをRSSから整理して表示します。"
};

let GROUPS = [
  { id: "all", label: "すべて" }
];

let STATUSES = [
  { id: "all", label: "すべて" },
  { id: "active", label: "現役" },
  { id: "og", label: "OG" }
];

const articleList = document.querySelector("#articleList");
const template = document.querySelector("#articleTemplate");
const summaryText = document.querySelector("#summaryText");
const updatedText = document.querySelector("#updatedText");
const searchInput = document.querySelector("#searchInput");
const pageTitle = document.querySelector("#pageTitle");
const pageIntro = document.querySelector("#pageIntro");
const memberDirectory = document.querySelector("#memberDirectory");

function createFilterButtons(container, items, activeKey, onClick) {
  if (!container) return;
  container.innerHTML = "";
  for (const item of items) {
    const button = document.createElement("button");
    button.className = "filter-button";
    button.type = "button";
    button.textContent = item.label;
    button.dataset.filterId = item.id;
    if (item.color) button.style.setProperty("--filter-color", item.color);
    button.setAttribute("aria-pressed", String(item.id === activeKey));
    button.addEventListener("click", () => onClick(item.id));
    container.append(button);
  }
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function groupClass(group) {
  return `category-${String(group || "other").normalize("NFKC").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "other"}`;
}

function categoryColor(group) {
  return (state.config?.categories?.categories || []).find((category) => category.id === group || category.label === group)?.color || "";
}

function statusLabel(status) {
  return (state.config?.categories?.statuses || []).find((item) => item.id === status)?.label || (status === "og" ? "OG" : "現役");
}

function normalize(value) {
  return String(value || "").toLowerCase();
}

function filteredArticles() {
  const query = normalize(state.query);
  return state.articles.filter((article) => {
    const pageOk = matchesPage(article);
    const groupOk = state.activeGroup === "all" || article.groups?.includes(state.activeGroup);
    const statusOk = state.activeStatus === "all" || article.statuses?.includes(state.activeStatus);
    const memberOk = !state.activeMember || (article.memberMatches || []).some((member) => member.name === state.activeMember);
    const text = normalize([
      article.title,
      article.sourceName,
      article.summary,
      ...(article.groups || []),
      ...(article.memberMatches || []).map((member) => member.name)
    ].join(" "));
    return pageOk && groupOk && statusOk && memberOk && (!query || text.includes(query));
  });
}

function matchesPage(article) {
  if (pageConfig.page === "group") return article.groups?.includes(pageConfig.group);
  if (pageConfig.page === "og") return article.statuses?.includes("og");
  if (pageConfig.page === "today") return isToday(article.publishedAt);
  if (pageConfig.page === "weekly") return isWithinDays(article.publishedAt, 7);
  return true;
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const nowParts = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const dateParts = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return partsKey(nowParts) === partsKey(dateParts);
}

function partsKey(parts) {
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isWithinDays(value, days) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
}

function render() {
  if (pageTitle) pageTitle.textContent = pageConfig.title;
  if (pageIntro) pageIntro.textContent = pageConfig.intro;

  if (pageConfig.page === "links") {
    renderLinks();
    return;
  }

  renderMemberDirectory();

  createFilterButtons(document.querySelector("#groupFilters"), GROUPS, state.activeGroup, (id) => {
    state.activeGroup = id;
    render();
  });

  createFilterButtons(document.querySelector("#statusFilters"), STATUSES, state.activeStatus, (id) => {
    state.activeStatus = id;
    render();
  });

  const articles = filteredArticles();
  articleList.innerHTML = "";
  const memberText = state.activeMember ? ` / ${state.activeMember}` : "";
  summaryText.textContent = `${articles.length}件の記事を表示中${memberText}`;

  if (!articles.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "条件に合う記事はまだありません。RSS更新後にここへ表示されます。";
    articleList.append(empty);
    return;
  }

  for (const [index, article] of articles.entries()) {
    if (index > 0 && index % 8 === 0) {
      const ad = document.createElement("section");
      ad.className = "ad-slot";
      ad.setAttribute("aria-label", "広告");
      ad.innerHTML = "<span>広告</span>";
      articleList.append(ad);
    }

    const node = template.content.cloneNode(true);
    const card = node.querySelector(".article-card");
    const title = node.querySelector(".title");
    const summary = node.querySelector(".summary");
    const source = node.querySelector(".source");
    const time = node.querySelector("time");
    const badges = node.querySelector(".badges");
    const readLink = node.querySelector(".read-link");

    title.textContent = article.title;
    title.href = article.articleUrl;
    summary.textContent = article.summary || "概要はRSSに含まれていません。";
    source.textContent = article.sourceName || "ニュース";
    time.textContent = formatDate(article.publishedAt);
    time.dateTime = article.publishedAt || "";
    readLink.href = article.articleUrl;

    for (const group of article.groups || []) {
      const badge = document.createElement("span");
      badge.className = `badge group-${groupClass(group)}`;
      badge.textContent = (state.config?.categories?.categories || []).find((category) => category.id === group || category.label === group)?.label || group;
      const color = categoryColor(group);
      if (color) badge.style.setProperty("--badge-color", color);
      badges.append(badge);
    }
    for (const status of article.statuses || []) {
      const badge = document.createElement("span");
      badge.className = `badge status-${status}`;
      badge.textContent = statusLabel(status);
      badges.append(badge);
    }
    for (const member of article.memberMatches || []) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = member.name;
      badges.append(badge);
    }

    articleList.append(card);
  }
}

function renderMemberDirectory() {
  if (!memberDirectory || pageConfig.page !== "members") return;
  memberDirectory.hidden = false;
  const groups = (state.config?.categories?.categories || []).map((category) => category.id);
  memberDirectory.innerHTML = "";

  const reset = document.createElement("a");
  reset.className = `member-pill${state.activeMember ? "" : " is-active"}`;
  reset.href = "./";
  reset.textContent = "全員";
  memberDirectory.append(reset);

  for (const group of groups) {
    const section = document.createElement("section");
    section.className = `member-group group-${groupClass(group)}`;
    const heading = document.createElement("h2");
    heading.textContent = (state.config?.categories?.categories || []).find((category) => category.id === group || category.label === group)?.label || group;
    section.append(heading);
    const list = document.createElement("div");
    list.className = "member-pill-list";
    const category = (state.config?.categories?.categories || []).find((item) => item.id === group || item.label === group);
    const members = state.members.filter((member) => member.group === group || member.group === category?.label);
    for (const member of members) {
      const link = document.createElement("a");
      link.className = `member-pill${member.name === state.activeMember ? " is-active" : ""}`;
      link.href = `?member=${encodeURIComponent(member.name)}`;
      link.textContent = `${member.name}${member.status === "og" ? ` / ${statusLabel("og")}` : ""}`;
      list.append(link);
    }
    section.append(list);
    memberDirectory.append(section);
  }
}

function renderLinks() {
  createFilterButtons(document.querySelector("#groupFilters"), GROUPS, state.activeGroup, (id) => {
    state.activeGroup = id;
    render();
  });
  const statusFilters = document.querySelector("#statusFilters");
  if (statusFilters) statusFilters.hidden = true;

  const query = normalize(state.query);
  const groups = state.links.filter((group) => {
    const category = (state.config?.categories?.categories || []).find((item) => item.id === state.activeGroup || item.label === state.activeGroup);
    return state.activeGroup === "all" || group.name === state.activeGroup || group.name === category?.label;
  });
  articleList.innerHTML = "";
  let count = 0;

  for (const group of groups) {
    const links = group.links.filter((link) => !query || normalize(`${group.name} ${link.label} ${link.url}`).includes(query));
    if (!links.length) continue;
    const card = document.createElement("article");
    card.className = `article-card link-card group-${groupClass(group.name)}`;
    const title = document.createElement("h2");
    title.textContent = (state.config?.categories?.categories || []).find((category) => category.id === group.name || category.label === group.name)?.label || group.name;
    const badge = document.createElement("span");
    badge.className = `badge group-${groupClass(group.name)}`;
    badge.textContent = (state.config?.categories?.categories || []).find((category) => category.id === group.name || category.label === group.name)?.label || group.name;
    const linkColor = categoryColor(group.name);
    if (linkColor) badge.style.setProperty("--badge-color", linkColor);
    const list = document.createElement("div");
    list.className = "official-links";
    for (const link of links) {
      const anchor = document.createElement("a");
      anchor.href = link.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = link.label;
      list.append(anchor);
      count += 1;
    }
    card.append(title, badge, list);
    articleList.append(card);
  }

  if (!count) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "条件に合う公式リンクはありません。";
    articleList.append(empty);
  }
  summaryText.textContent = `${count}件の公式リンクを表示中`;
  updatedText.textContent = "";
}

async function loadJson(path, fallback) {
  try {
    const response = await fetch(`${pageConfig.base}/${path}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(error);
    return fallback;
  }
}

async function loadTemplateConfig() {
  const [site, categories, theme, ads, ogp, operator] = await Promise.all([
    loadJson("config/site.json", DEFAULT_CONFIG.site),
    loadJson("config/categories.json", DEFAULT_CONFIG.categories),
    loadJson("config/theme.json", DEFAULT_CONFIG.theme),
    loadJson("config/ads.json", DEFAULT_CONFIG.ads),
    loadJson("config/ogp.json", DEFAULT_CONFIG.ogp),
    loadJson("config/operator.json", DEFAULT_CONFIG.operator)
  ]);
  state.config = { site, categories, theme, ads, ogp, operator };
  applyTemplateConfig();
}

function applyTemplateConfig() {
  const site = state.config?.site || DEFAULT_CONFIG.site;
  const theme = state.config?.theme || DEFAULT_CONFIG.theme;
  const categories = state.config?.categories || DEFAULT_CONFIG.categories;
  GROUPS = [{ id: "all", label: categories.allLabel || "すべて" }, ...(categories.categories || [])];
  STATUSES = [{ id: "all", label: categories.allLabel || "すべて" }, ...(categories.statuses || [])];
  document.documentElement.style.setProperty("--brand-a", theme.brandColors?.[0] || "#812990");
  document.documentElement.style.setProperty("--brand-b", theme.brandColors?.[1] || "#f19db5");
  document.documentElement.style.setProperty("--brand-c", theme.brandColors?.[2] || "#7cc7e8");
  document.documentElement.style.setProperty("--brand-nogi", theme.brandColors?.[0] || "#812990");
  document.documentElement.style.setProperty("--brand-sakura", theme.brandColors?.[1] || "#f19db5");
  document.documentElement.style.setProperty("--brand-hinata", theme.brandColors?.[2] || "#7cc7e8");
  document.documentElement.style.setProperty("--page-bg", theme.background || "#ffffff");
  document.documentElement.style.setProperty("--text-main", theme.text || "#201826");
  document.documentElement.style.setProperty("--text-muted", theme.mutedText || "#6f6574");
  document.title = pageConfig.page === "home" ? site.siteName : `${pageConfig.title} | ${site.siteName}`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", site.description || "");
  document.querySelectorAll(".brand").forEach((brand) => {
    brand.textContent = site.siteName || "速報サイト";
    brand.setAttribute("aria-label", `${site.siteName || "速報サイト"}トップへ`);
  });
  if (pageConfig.page === "home") {
    document.querySelectorAll(".tagline").forEach((tagline) => { tagline.textContent = site.tagline || site.description || ""; });
  }
  document.querySelectorAll(".site-footer > p").forEach((footer) => { footer.textContent = site.footerNote || footer.textContent; });
  if (searchInput) searchInput.placeholder = site.searchPlaceholder || searchInput.placeholder;
  renderTemplateNavigation();
}

function resolveTemplatePath(path) {
  if (!path) return pageConfig.base || ".";
  if (/^https?:\/\//.test(path) || path.startsWith("/")) return path;
  return `${pageConfig.base}/${path.replace(/^\.\//, "")}`;
}

function renderTemplateNavigation() {
  const nav = document.querySelector(".category-nav");
  if (!nav) return;
  const categories = state.config?.categories || DEFAULT_CONFIG.categories;
  const links = [
    { label: "トップ", path: "./", className: "home" },
    ...(categories.categories || []).map((category) => ({ label: category.label, path: category.path, className: groupClass(category.id), color: category.color })),
    ...(categories.archiveLinks || []).map((link) => ({ ...link, className: "archive" }))
  ];
  nav.innerHTML = "";
  for (const link of links) {
    const anchor = document.createElement("a");
    anchor.className = `nav-chip ${link.className || "archive"}`;
    anchor.href = resolveTemplatePath(link.path || "./");
    anchor.textContent = link.label;
    if (link.color) anchor.style.setProperty("--nav-color", link.color);
    nav.append(anchor);
  }
}

async function load() {
  try {
    await loadTemplateConfig();
    const [articleResponse, memberResponse, linkResponse] = await Promise.all([
      loadJson("data/articles.json", { articles: [] }),
      loadJson("data/members.json", { members: [] }),
      loadJson("data/official-links.json", { groups: [] })
    ]);
    const payload = articleResponse;
    const memberPayload = memberResponse;
    const linkPayload = linkResponse;
    state.articles = Array.isArray(payload.articles) ? payload.articles : [];
    state.members = Array.isArray(memberPayload.members) ? memberPayload.members : [];
    state.links = Array.isArray(linkPayload.groups) ? linkPayload.groups : [];
    if (payload.updatedAt) {
      updatedText.textContent = `最終更新: ${formatDate(payload.updatedAt)}`;
    }
  } catch (error) {
    summaryText.textContent = "記事データを読み込めませんでした。";
    console.error(error);
  }
  render();
}

if (pageConfig.page === "group") state.activeGroup = pageConfig.group;
if (pageConfig.page === "og") state.activeStatus = "og";

searchInput?.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

load();
