async function readJson(path, fallback) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    return await response.json();
  } catch (error) {
    console.warn(error);
    return fallback;
  }
}

const base = document.body.dataset.base || ".";
const rootPath = new URL(base + "/", window.location.href);
function fromRoot(path) {
  return new URL(path, rootPath).href;
}
const payloads = await Promise.all([
  readJson(fromRoot("config/site.json"), {}),
  readJson(fromRoot("config/categories.json"), { categories: [], archiveLinks: [] }),
  readJson(fromRoot("config/theme.json"), {}),
  readJson(fromRoot("config/ogp.json"), {}),
  readJson(fromRoot("config/operator.json"), {})
]);
const site = payloads[0];
const categories = payloads[1];
const theme = payloads[2];
const ogp = payloads[3];
const operator = payloads[4];

function setMeta(name, content, attr) {
  if (!content) return;
  const key = attr || "name";
  let meta = document.head.querySelector("meta[" + key + "=\"" + name + "\"]");
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(key, name);
    document.head.append(meta);
  }
  meta.setAttribute("content", content);
}

function resolvePath(path) {
  if (!path) return base;
  if (/^https?:\/\//.test(path) || path.startsWith("/")) return path;
  return new URL(path.replace(/^\.\//, ""), rootPath).href;
}

function slug(value) {
  return String(value || "archive").normalize("NFKC").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "archive";
}

document.documentElement.style.setProperty("--brand-a", theme.brandColors?.[0] || "#812990");
document.documentElement.style.setProperty("--brand-b", theme.brandColors?.[1] || "#f19db5");
document.documentElement.style.setProperty("--brand-c", theme.brandColors?.[2] || "#7cc7e8");
document.documentElement.style.setProperty("--brand-nogi", theme.brandColors?.[0] || "#812990");
document.documentElement.style.setProperty("--brand-sakura", theme.brandColors?.[1] || "#f19db5");
document.documentElement.style.setProperty("--brand-hinata", theme.brandColors?.[2] || "#7cc7e8");

const pageHeading = document.querySelector("h1")?.textContent?.trim();
if (site.siteName) document.title = pageHeading && pageHeading !== site.siteName ? pageHeading + " | " + site.siteName : site.siteName;
setMeta("description", site.description || ogp.description || "");
setMeta("og:title", ogp.title || site.siteName || "", "property");
setMeta("og:description", ogp.description || site.description || "", "property");
setMeta("og:type", ogp.type || "website", "property");
if (site.baseUrl) setMeta("og:url", site.baseUrl, "property");
if (ogp.image) setMeta("og:image", ogp.image, "property");
setMeta("twitter:card", ogp.twitterCard || "summary_large_image");

document.querySelectorAll(".brand").forEach((brand) => {
  brand.textContent = site.siteName || brand.textContent;
  brand.setAttribute("aria-label", (site.siteName || brand.textContent) + "トップへ");
});

document.querySelectorAll(".site-footer > p").forEach((footer) => {
  footer.textContent = site.footerNote || footer.textContent;
});

const nav = document.querySelector(".category-nav");
if (nav) {
  const links = [
    { label: "トップ", path: "./", className: "home" },
    ...(categories.categories || []).map((category) => ({ label: category.label, path: category.path, className: "category-" + slug(category.id), color: category.color })),
    ...(categories.archiveLinks || []).map((link) => ({ ...link, className: "archive" }))
  ];
  nav.innerHTML = "";
  for (const link of links) {
    const anchor = document.createElement("a");
    anchor.className = "nav-chip " + (link.className || "archive");
    anchor.href = resolvePath(link.path || "./");
    anchor.textContent = link.label;
    if (link.color) anchor.style.setProperty("--nav-color", link.color);
    nav.append(anchor);
  }
}

document.querySelectorAll('[data-config="siteName"]').forEach((node) => { node.textContent = site.siteName || node.textContent; });
document.querySelectorAll('[data-config="operatorName"]').forEach((node) => { node.textContent = operator.name || node.textContent; });
document.querySelectorAll('[data-config="operatorProfile"]').forEach((node) => { node.textContent = operator.profile || node.textContent; });
