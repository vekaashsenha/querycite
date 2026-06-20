export const urlErrorMessage = "Please enter a valid website, for example byldgroup.com";

const domainPattern = /^(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const domainInTextPattern = /(?:^|[^a-z0-9.-])((?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})(?:[/?#][^\s)\]]*)?/i;
const domainWithPathPattern = /^((?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})(?:[/?#].*)?$/i;

function unwrapPastedLink(value: string) {
  return value
    .trim()
    .replace(/^<(.+)>$/, "$1")
    .replace(/^['"](.+)['"]$/, "$1");
}

function extractWebsiteCandidate(input: string) {
  const value = unwrapPastedLink(input);
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const plainDomain = value.match(domainWithPathPattern);
  if (plainDomain) {
    return value;
  }

  const domainFromPastedText = value.match(domainInTextPattern);
  if (domainFromPastedText?.[1]) {
    return domainFromPastedText[1];
  }

  const urlFromPastedText = value.match(/https?:\/\/[^\s)\]]+/i);
  if (urlFromPastedText?.[0]) {
    return urlFromPastedText[0];
  }

  return value;
}

function isValidWebsiteHostname(hostname: string) {
  return domainPattern.test(hostname);
}

export function normalizeWebsiteUrl(input: string) {
  const candidate = extractWebsiteCandidate(input);
  if (!candidate) return null;

  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;

  try {
    const parsed = new URL(withProtocol);
    const hasAllowedProtocol = parsed.protocol === "https:" || parsed.protocol === "http:";
    const hasCredentials = Boolean(parsed.username || parsed.password);

    if (!hasAllowedProtocol || hasCredentials || !isValidWebsiteHostname(parsed.hostname)) {
      return null;
    }

    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}