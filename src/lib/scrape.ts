import * as cheerio from "cheerio";
import type { ScrapedPage } from "./types";

const MAX_BODY_CHARS = 14000;
const MAX_LINKS = 40;
const MAX_HEADINGS = 80;
const MAX_SCHEMA_BLOCKS = 8;

function normalizeUrl(rawUrl: string) {
  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const url = new URL(withProtocol);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs can be audited.");
  }

  return url.toString();
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export async function scrapePage(rawUrl: string): Promise<ScrapedPage> {
  const url = normalizeUrl(rawUrl);
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; AIVisibilityAuditor/0.1; +https://example.com/bot)",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Could not fetch the page. Status: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error("The URL did not return an HTML page.");
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  $("script, style, noscript, svg, canvas, iframe, form, nav, footer").remove();

  const title = cleanText($("title").first().text());
  const metaDescription = cleanText(
    $('meta[name="description"]').attr("content") ??
      $('meta[property="og:description"]').attr("content") ??
      "",
  );

  const headings = $("h1, h2, h3, h4")
    .map((_, element) => ({
      level: element.tagName.toUpperCase(),
      text: cleanText($(element).text()),
    }))
    .get()
    .filter((heading) => heading.text.length > 0)
    .slice(0, MAX_HEADINGS);

  const links = $("a[href]")
    .map((_, element) => {
      const href = $(element).attr("href") ?? "";
      const text = cleanText($(element).text() || href);

      try {
        return { text, href: new URL(href, url).toString() };
      } catch {
        return { text, href };
      }
    })
    .get()
    .filter((link) => link.text.length > 0 && link.href.length > 0)
    .slice(0, MAX_LINKS);

  const schemaMarkup = $('script[type="application/ld+json"]')
    .map((_, element) => cleanText($(element).text()))
    .get()
    .filter(Boolean)
    .slice(0, MAX_SCHEMA_BLOCKS);

  const bodyText = cleanText($("body").text()).slice(0, MAX_BODY_CHARS);

  return {
    url,
    title,
    metaDescription,
    headings,
    bodyText,
    links,
    schemaMarkup,
  };
}
