// ../../packages/core/src/engines/errors.ts
var ExtractionError = class extends Error {
  code;
  url;
  statusCode;
  retryable;
  details;
  constructor(options) {
    super(options.message, { cause: options.cause });
    this.name = "ExtractionError";
    this.code = options.code;
    this.url = options.url;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? (options.code === "RATE_LIMITED" /* RATE_LIMITED */ || options.code === "NETWORK_BLOCKED" /* NETWORK_BLOCKED */);
    this.details = options.details;
  }
};

// ../../packages/core/src/browser/EcommerceJsonLdEngine.ts
function normalizeAvailability(raw) {
  if (!raw) return "Unknown";
  const lower = String(raw).toLowerCase();
  if (lower.includes("instock")) return "InStock";
  if (lower.includes("outofstock")) return "OutOfStock";
  if (lower.includes("preorder")) return "PreOrder";
  if (lower.includes("discontinued")) return "Discontinued";
  return "Unknown";
}
function parseImages(raw) {
  if (!raw) return [];
  if (typeof raw === "string") return [raw];
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const obj = item;
        return String(obj.url || obj.contentUrl || "");
      }
      return "";
    }).filter(Boolean);
  }
  if (typeof raw === "object") {
    const obj = raw;
    const url = obj.url || obj.contentUrl;
    return url ? [String(url)] : [];
  }
  return [];
}
var EcommerceJsonLdEngine = class {
  name = "EcommerceJsonLdEngine";
  extract(options) {
    const startTime = Date.now();
    const doc = options?.document ?? (typeof document !== "undefined" ? document : void 0);
    if (!doc) {
      return {
        success: false,
        data: [],
        error: new ExtractionError({
          code: "EMPTY_TARGET" /* EMPTY_TARGET */,
          message: "No DOM document available for extraction"
        }),
        durationMs: Date.now() - startTime
      };
    }
    const scriptElements = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
    const products = [];
    const currentUrl = options?.url || (doc.location ? doc.location.href : "");
    for (const script of scriptElements) {
      const rawContent = (script.textContent || "").trim();
      if (!rawContent) continue;
      try {
        const parsed = JSON.parse(rawContent);
        this.findAndAddProducts(parsed, products, currentUrl, options);
      } catch {
      }
    }
    const durationMs = Date.now() - startTime;
    if (products.length === 0) {
      return {
        success: false,
        data: [],
        error: new ExtractionError({
          code: "EMPTY_TARGET" /* EMPTY_TARGET */,
          message: "No JSON-LD Product schemas found in DOM"
        }),
        durationMs
      };
    }
    return {
      success: true,
      data: products,
      durationMs,
      metadata: {
        scriptCount: scriptElements.length,
        productCount: products.length
      }
    };
  }
  findAndAddProducts(node, accumulator, currentUrl, options) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) {
        this.findAndAddProducts(item, accumulator, currentUrl, options);
      }
      return;
    }
    const record = node;
    if (record["@graph"] && Array.isArray(record["@graph"])) {
      for (const item of record["@graph"]) {
        this.findAndAddProducts(item, accumulator, currentUrl, options);
      }
      return;
    }
    const type = record["@type"];
    const isProduct = type === "Product" || type === "IndividualProduct" || type === "SomeProducts" || Array.isArray(type) && type.includes("Product");
    if (isProduct) {
      const product = this.mapToProduct(record, currentUrl, options);
      if (product) {
        accumulator.push(product);
      }
    }
  }
  mapToProduct(raw, currentUrl, options) {
    const brandObj = raw.brand;
    const brand = typeof brandObj === "string" ? brandObj : brandObj?.name;
    const offersRaw = raw.offers;
    let price;
    let originalPrice;
    let currency;
    let availability = "Unknown";
    const variants = [];
    if (offersRaw) {
      const offersList = Array.isArray(offersRaw) ? offersRaw : [offersRaw];
      const primaryOffer = offersList[0];
      if (primaryOffer) {
        const parsedPrice = parseFloat(String(primaryOffer.price ?? primaryOffer.lowPrice ?? ""));
        if (!Number.isNaN(parsedPrice)) price = parsedPrice;
        const parsedHighPrice = parseFloat(String(primaryOffer.highPrice ?? ""));
        if (!Number.isNaN(parsedHighPrice)) originalPrice = parsedHighPrice;
        currency = primaryOffer.priceCurrency || void 0;
        availability = normalizeAvailability(primaryOffer.availability);
      }
      if (options?.extractVariants && offersList.length > 1) {
        for (const offer of offersList) {
          const offerPrice = parseFloat(String(offer.price ?? ""));
          variants.push({
            id: offer.sku ? String(offer.sku) : void 0,
            sku: offer.sku ? String(offer.sku) : void 0,
            name: offer.name || offer.itemCondition || void 0,
            price: Number.isNaN(offerPrice) ? 0 : offerPrice,
            currency: offer.priceCurrency || currency,
            availability: normalizeAvailability(offer.availability)
          });
        }
      }
    }
    const ratingRaw = raw.aggregateRating;
    let rating;
    if (ratingRaw) {
      const val = parseFloat(String(ratingRaw.ratingValue ?? ""));
      const count = parseInt(String(ratingRaw.reviewCount ?? ratingRaw.ratingCount ?? ""), 10);
      const best = parseFloat(String(ratingRaw.bestRating ?? ""));
      if (!Number.isNaN(val)) {
        rating = {
          value: val,
          count: Number.isNaN(count) ? 0 : count,
          bestRating: Number.isNaN(best) ? void 0 : best
        };
      }
    }
    return {
      id: raw.sku ? String(raw.sku) : raw["@id"] ? String(raw["@id"]) : void 0,
      sku: raw.sku ? String(raw.sku) : void 0,
      name: String(raw.name || "").trim(),
      description: raw.description ? String(raw.description).trim() : void 0,
      brand,
      url: raw.url || currentUrl,
      currency,
      price,
      originalPrice,
      availability,
      images: parseImages(raw.image),
      rating,
      variants: variants.length > 0 ? variants : void 0,
      rawSchemaType: typeof raw["@type"] === "string" ? raw["@type"] : "Product",
      metadata: options?.includeRawLdJson ? raw : void 0
    };
  }
};

// ../../packages/core/src/browser/SSRHydrationEngine.ts
var SSRHydrationEngine = class {
  name = "SSRHydrationEngine";
  extract(options) {
    const startTime = Date.now();
    const doc = options?.document ?? (typeof document !== "undefined" ? document : void 0);
    const win = options?.windowObj ?? (typeof window !== "undefined" ? window : void 0);
    if (win) {
      const winAny = win;
      if (winAny.__NEXT_DATA__ && typeof winAny.__NEXT_DATA__ === "object") {
        const nd = winAny.__NEXT_DATA__;
        const rawLength = JSON.stringify(nd).length;
        return {
          success: true,
          data: {
            framework: "next",
            data: nd.props?.pageProps || nd.props || nd,
            buildId: nd.buildId,
            pagePath: nd.page,
            rawScriptContentLength: rawLength
          },
          durationMs: Date.now() - startTime,
          metadata: { source: "window.__NEXT_DATA__" }
        };
      }
      if (winAny.Shopify && typeof winAny.Shopify === "object") {
        const shopifyMeta = winAny.ShopifyAnalytics?.meta;
        const shopifyData = {
          ...winAny.Shopify,
          ...shopifyMeta ? { meta: shopifyMeta } : {}
        };
        return {
          success: true,
          data: {
            framework: "unknown",
            data: shopifyData,
            buildId: winAny.Shopify.theme,
            rawScriptContentLength: JSON.stringify(shopifyData).length
          },
          durationMs: Date.now() - startTime,
          metadata: { source: "window.Shopify" }
        };
      }
      if (winAny.__PRELOADED_STATE__ && typeof winAny.__PRELOADED_STATE__ === "object") {
        const data = winAny.__PRELOADED_STATE__;
        return {
          success: true,
          data: {
            framework: "redux",
            data,
            rawScriptContentLength: JSON.stringify(data).length
          },
          durationMs: Date.now() - startTime,
          metadata: { source: "window.__PRELOADED_STATE__" }
        };
      }
      if (winAny.__NUXT__ && typeof winAny.__NUXT__ === "object") {
        const data = winAny.__NUXT__;
        return {
          success: true,
          data: {
            framework: "nuxt",
            data,
            rawScriptContentLength: JSON.stringify(data).length
          },
          durationMs: Date.now() - startTime,
          metadata: { source: "window.__NUXT__" }
        };
      }
      if (winAny.__remixContext && typeof winAny.__remixContext === "object") {
        const data = winAny.__remixContext;
        return {
          success: true,
          data: {
            framework: "remix",
            data,
            rawScriptContentLength: JSON.stringify(data).length
          },
          durationMs: Date.now() - startTime,
          metadata: { source: "window.__remixContext" }
        };
      }
    }
    if (doc) {
      const nextScript = doc.getElementById("__NEXT_DATA__") || doc.querySelector("script#__NEXT_DATA__");
      if (nextScript && nextScript.textContent) {
        try {
          const parsed = JSON.parse(nextScript.textContent.trim());
          const pageProps = parsed.props?.pageProps || parsed.props || parsed;
          return {
            success: true,
            data: {
              framework: "next",
              data: pageProps,
              buildId: parsed.buildId,
              pagePath: parsed.page,
              rawScriptContentLength: nextScript.textContent.length
            },
            durationMs: Date.now() - startTime,
            metadata: { source: "script#__NEXT_DATA__" }
          };
        } catch {
        }
      }
      const nuxt3Script = doc.getElementById("__NUXT_DATA__") || doc.querySelector("script#__NUXT_DATA__");
      if (nuxt3Script && nuxt3Script.textContent) {
        try {
          const parsed = JSON.parse(nuxt3Script.textContent.trim());
          return {
            success: true,
            data: {
              framework: "nuxt",
              data: { nuxtData: parsed },
              rawScriptContentLength: nuxt3Script.textContent.length
            },
            durationMs: Date.now() - startTime,
            metadata: { source: "script#__NUXT_DATA__" }
          };
        } catch {
        }
      }
      const scripts = Array.from(doc.querySelectorAll("script:not([src])"));
      for (const script of scripts) {
        const text = script.textContent || "";
        if (!text) continue;
        const preloadedMatch = text.match(/window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});?\s*(?:<\/script>|\n|$)/);
        if (preloadedMatch && preloadedMatch[1]) {
          try {
            const parsed = JSON.parse(preloadedMatch[1]);
            return {
              success: true,
              data: {
                framework: "redux",
                data: parsed,
                rawScriptContentLength: preloadedMatch[1].length
              },
              durationMs: Date.now() - startTime,
              metadata: { source: "inline script __PRELOADED_STATE__" }
            };
          } catch {
          }
        }
        const nuxtMatch = text.match(/window\.__NUXT__\s*=\s*({[\s\S]*?});?\s*(?:<\/script>|\n|$)/);
        if (nuxtMatch && nuxtMatch[1]) {
          try {
            const parsed = JSON.parse(nuxtMatch[1]);
            return {
              success: true,
              data: {
                framework: "nuxt",
                data: parsed,
                rawScriptContentLength: nuxtMatch[1].length
              },
              durationMs: Date.now() - startTime,
              metadata: { source: "inline script __NUXT__" }
            };
          } catch {
          }
        }
        const remixMatch = text.match(/window\.__remixContext\s*=\s*({[\s\S]*?});?\s*(?:<\/script>|\n|$)/);
        if (remixMatch && remixMatch[1]) {
          try {
            const parsed = JSON.parse(remixMatch[1]);
            return {
              success: true,
              data: {
                framework: "remix",
                data: parsed,
                rawScriptContentLength: remixMatch[1].length
              },
              durationMs: Date.now() - startTime,
              metadata: { source: "inline script __remixContext" }
            };
          } catch {
          }
        }
        const shopifyMetaMatch = text.match(/var\s+meta\s*=\s*({[\s\S]*?"products?"[\s\S]*?});/);
        if (shopifyMetaMatch && shopifyMetaMatch[1]) {
          try {
            const parsed = JSON.parse(shopifyMetaMatch[1]);
            return {
              success: true,
              data: {
                framework: "unknown",
                data: parsed,
                rawScriptContentLength: shopifyMetaMatch[1].length
              },
              durationMs: Date.now() - startTime,
              metadata: { source: "inline script Shopify meta" }
            };
          } catch {
          }
        }
      }
    }
    return {
      success: false,
      error: new ExtractionError({
        code: "EMPTY_TARGET" /* EMPTY_TARGET */,
        message: "No SSR hydration state found in DOM scripts or window globals"
      }),
      durationMs: Date.now() - startTime
    };
  }
  /**
   * Code snippet to be injected into world: 'MAIN' via chrome.scripting.executeScript
   * to access window.Shopify, window.__PRELOADED_STATE__, etc., which are inaccessible
   * from the default isolated world content script.
   */
  static getMainWorldExtractor() {
    return function extractMainWorldState() {
      const win = window;
      return {
        shopify: win.Shopify || null,
        shopifyAnalytics: win.ShopifyAnalytics || null,
        preloadedState: win.__PRELOADED_STATE__ || null,
        nextData: win.__NEXT_DATA__ || null,
        nuxt: win.__NUXT__ || null,
        remixContext: win.__remixContext || null,
        apolloState: win.__APOLLO_STATE__ || null
      };
    };
  }
};

// ../../packages/core/src/browser/AIMarkdownEngine.ts
var TEXT_NODE = 3;
var ELEMENT_NODE = 1;
var AIMarkdownEngine = class {
  name = "AIMarkdownEngine";
  extract(options) {
    const startTime = Date.now();
    const doc = options?.document ?? (typeof document !== "undefined" ? document : void 0);
    if (!doc) {
      return {
        success: false,
        error: new ExtractionError({
          code: "EMPTY_TARGET" /* EMPTY_TARGET */,
          message: "No DOM document available for AI Markdown extraction"
        }),
        durationMs: Date.now() - startTime
      };
    }
    let rootElement = null;
    if (options?.selector) {
      rootElement = doc.querySelector(options.selector);
    }
    if (!rootElement) {
      rootElement = doc.querySelector("main") || doc.querySelector("article") || doc.querySelector('[role="main"]') || doc.querySelector("#content") || doc.querySelector(".content") || doc.body;
    }
    if (!rootElement) {
      return {
        success: false,
        error: new ExtractionError({
          code: "EMPTY_TARGET" /* EMPTY_TARGET */,
          message: "Could not find a content root element to convert to Markdown"
        }),
        durationMs: Date.now() - startTime
      };
    }
    const clone = rootElement.cloneNode(true);
    if (options?.cleanBoilerplate !== false) {
      const boilerplateSelectors = [
        "script",
        "style",
        "noscript",
        "iframe",
        "svg",
        "canvas",
        "nav",
        "footer",
        "aside",
        "form",
        "dialog",
        'header[role="banner"]',
        '[aria-hidden="true"]',
        ".ad",
        ".advertisement",
        ".cookie-banner"
      ];
      const toRemove = clone.querySelectorAll(boilerplateSelectors.join(","));
      toRemove.forEach((el) => el.remove());
    }
    const headings = [];
    const markdown = this.nodeToMarkdown(clone, headings, options).trim();
    const charCount = markdown.length;
    const wordCount = markdown ? markdown.split(/\s+/).filter(Boolean).length : 0;
    const tokenEstimate = Math.ceil(charCount / 4);
    const currentUrl = options?.url || (doc.location ? doc.location.href : "");
    const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute("content") || void 0;
    const docLang = doc.documentElement?.getAttribute("lang") || void 0;
    let chunks;
    if (options?.chunking?.enabled) {
      chunks = this.createChunks(markdown, options.chunking.maxChunkSize, options.chunking.chunkOverlap);
    }
    return {
      success: true,
      data: {
        url: currentUrl,
        title: doc.title || (headings[0] ? headings[0].text : void 0),
        markdown,
        charCount,
        wordCount,
        tokenEstimate,
        headings,
        chunks,
        metadata: {
          extractedAt: (/* @__PURE__ */ new Date()).toISOString(),
          language: docLang,
          description: metaDesc
        }
      },
      durationMs: Date.now() - startTime,
      metadata: {
        headingsCount: headings.length,
        tokens: tokenEstimate
      }
    };
  }
  nodeToMarkdown(node, headings, options) {
    if (node.nodeType === TEXT_NODE) {
      return (node.textContent || "").replace(/[ \t\r\n]+/g, " ");
    }
    if (node.nodeType !== ELEMENT_NODE) {
      return "";
    }
    const element = node;
    const tag = element.tagName.toLowerCase();
    const getChildrenMarkdown = () => {
      let res = "";
      for (let i = 0; i < element.childNodes.length; i++) {
        res += this.nodeToMarkdown(element.childNodes[i], headings, options);
      }
      return res;
    };
    switch (tag) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const level = parseInt(tag[1], 10);
        const text = getChildrenMarkdown().trim();
        if (text) {
          headings.push({ level, text });
          return `

${"#".repeat(level)} ${text}

`;
        }
        return "";
      }
      case "p": {
        const content = getChildrenMarkdown().trim();
        return content ? `

${content}

` : "";
      }
      case "a": {
        const href = element.getAttribute("href");
        const content = getChildrenMarkdown().trim();
        if (!content) return "";
        if (options?.preserveLinks === false || !href || href.startsWith("javascript:")) {
          return content;
        }
        return `[${content}](${href})`;
      }
      case "img": {
        if (options?.preserveImages === false) return "";
        const src = element.getAttribute("src");
        const alt = element.getAttribute("alt") || "";
        return src ? `![${alt}](${src})` : "";
      }
      case "strong":
      case "b": {
        const content = getChildrenMarkdown().trim();
        return content ? `**${content}**` : "";
      }
      case "em":
      case "i": {
        const content = getChildrenMarkdown().trim();
        return content ? `*${content}*` : "";
      }
      case "code": {
        if (element.parentElement?.tagName.toLowerCase() === "pre") {
          return element.textContent || "";
        }
        const content = element.textContent || "";
        return content ? `\`${content}\`` : "";
      }
      case "pre": {
        const codeEl = element.querySelector("code");
        const lang = codeEl?.className?.match(/language-([a-z0-9_-]+)/i)?.[1] || "";
        const content = (codeEl ? codeEl.textContent : element.textContent) || "";
        return `

\`\`\`${lang}
${content.trim()}
\`\`\`

`;
      }
      case "blockquote": {
        const content = getChildrenMarkdown().trim();
        if (!content) return "";
        return `

${content.split("\n").map((line) => `> ${line}`).join("\n")}

`;
      }
      case "ul": {
        const items = [];
        for (let i = 0; i < element.children.length; i++) {
          const child = element.children[i];
          if (child.tagName.toLowerCase() === "li") {
            const itemText = this.nodeToMarkdown(child, headings, options).trim();
            if (itemText) items.push(`- ${itemText}`);
          }
        }
        return items.length > 0 ? `

${items.join("\n")}

` : "";
      }
      case "ol": {
        const items = [];
        let idx = 1;
        for (let i = 0; i < element.children.length; i++) {
          const child = element.children[i];
          if (child.tagName.toLowerCase() === "li") {
            const itemText = this.nodeToMarkdown(child, headings, options).trim();
            if (itemText) {
              items.push(`${idx}. ${itemText}`);
              idx++;
            }
          }
        }
        return items.length > 0 ? `

${items.join("\n")}

` : "";
      }
      case "li": {
        return getChildrenMarkdown().trim();
      }
      case "table": {
        return this.tableToMarkdown(element);
      }
      case "hr": {
        return "\n\n---\n\n";
      }
      case "br": {
        return "\n";
      }
      default: {
        return getChildrenMarkdown();
      }
    }
  }
  tableToMarkdown(tableEl) {
    const rows = Array.from(tableEl.querySelectorAll("tr"));
    if (rows.length === 0) return "";
    const tableMatrix = [];
    let maxCols = 0;
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("th, td")).map(
        (cell) => (cell.textContent || "").replace(/[ \t\r\n]+/g, " ").replace(/\|/g, "\\|").trim()
      );
      if (cells.length > maxCols) maxCols = cells.length;
      tableMatrix.push(cells);
    }
    if (maxCols === 0) return "";
    for (const row of tableMatrix) {
      while (row.length < maxCols) row.push("");
    }
    const lines = [];
    const header = tableMatrix[0];
    lines.push(`| ${header.join(" | ")} |`);
    lines.push(`| ${header.map(() => "---").join(" | ")} |`);
    for (let i = 1; i < tableMatrix.length; i++) {
      lines.push(`| ${tableMatrix[i].join(" | ")} |`);
    }
    return `

${lines.join("\n")}

`;
  }
  createChunks(text, maxChunkSize, overlap) {
    const chunks = [];
    let start = 0;
    let index = 0;
    while (start < text.length) {
      const end = Math.min(start + maxChunkSize, text.length);
      const chunkText = text.slice(start, end);
      chunks.push({
        index,
        text: chunkText,
        charCount: chunkText.length,
        tokenEstimate: Math.ceil(chunkText.length / 4)
      });
      index++;
      if (end >= text.length) break;
      start = end - overlap;
    }
    return chunks;
  }
};

// ../../packages/core/src/browser/B2BEnricherEngine.ts
var EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
var INVALID_EMAIL_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".css", ".js"];
var IGNORED_EMAIL_DOMAINS = ["example.com", "domain.com", "email.com", "sentry.io"];
var PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b/g;
var B2BEnricherEngine = class {
  name = "B2BEnricherEngine";
  extract(options) {
    const startTime = Date.now();
    const doc = options?.document ?? (typeof document !== "undefined" ? document : void 0);
    if (!doc) {
      return {
        success: false,
        error: new ExtractionError({
          code: "EMPTY_TARGET" /* EMPTY_TARGET */,
          message: "No DOM document available for B2B lead enrichment"
        }),
        durationMs: Date.now() - startTime
      };
    }
    const currentUrl = options?.url || (doc.location ? doc.location.href : "");
    let domain = "";
    try {
      domain = new URL(currentUrl).hostname.replace(/^www\./, "");
    } catch {
      domain = doc.location ? doc.location.hostname.replace(/^www\./, "") : "";
    }
    const bodyText = doc.body ? doc.body.innerText || doc.body.textContent || "" : "";
    const allLinks = Array.from(doc.querySelectorAll("a[href]"));
    const emails = /* @__PURE__ */ new Set();
    for (const link of allLinks) {
      const href = link.getAttribute("href") || "";
      if (href.startsWith("mailto:")) {
        const mail = href.replace(/^mailto:/i, "").split("?")[0].trim().toLowerCase();
        if (this.isValidEmail(mail)) {
          emails.add(mail);
        }
      }
    }
    const textEmailMatches = bodyText.match(EMAIL_REGEX) || [];
    for (const mail of textEmailMatches) {
      const cleaned = mail.toLowerCase().trim();
      if (this.isValidEmail(cleaned)) {
        emails.add(cleaned);
      }
    }
    const phoneNumbers = /* @__PURE__ */ new Set();
    for (const link of allLinks) {
      const href = link.getAttribute("href") || "";
      if (href.startsWith("tel:")) {
        const phone = href.replace(/^tel:/i, "").replace(/[^\d+]/g, "");
        if (phone.length >= 7) phoneNumbers.add(phone);
      } else if (href.includes("wa.me/") || href.includes("api.whatsapp.com/send") || href.includes("whatsapp.com")) {
        const match = href.match(/(?:phone=|wa\.me\/)(\+?\d+)/);
        if (match && match[1]) {
          const waPhone = match[1].replace(/[^\d+]/g, "");
          if (waPhone.length >= 7) phoneNumbers.add(waPhone.startsWith("+") ? waPhone : `+${waPhone}`);
        }
      }
    }
    const textPhoneMatches = bodyText.match(PHONE_REGEX) || [];
    for (const rawPhone of textPhoneMatches) {
      const digitsOnly = rawPhone.replace(/[^\d]/g, "");
      if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
        phoneNumbers.add(rawPhone.trim());
      }
    }
    const socialLinks = {};
    for (const link of allLinks) {
      const href = (link.getAttribute("href") || "").trim();
      if (!href) continue;
      if (href.includes("linkedin.com/company/") || href.includes("linkedin.com/in/")) {
        if (!socialLinks.linkedin) socialLinks.linkedin = href;
      } else if (href.includes("twitter.com/") || href.includes("x.com/")) {
        if (!socialLinks.twitter && !href.includes("/intent/")) socialLinks.twitter = href;
      } else if (href.includes("github.com/")) {
        if (!socialLinks.github) socialLinks.github = href;
      } else if (href.includes("facebook.com/")) {
        if (!socialLinks.facebook && !href.includes("/sharer")) socialLinks.facebook = href;
      } else if (href.includes("instagram.com/")) {
        if (!socialLinks.instagram) socialLinks.instagram = href;
      } else if (href.includes("youtube.com/")) {
        if (!socialLinks.youtube) socialLinks.youtube = href;
      }
    }
    const technologies = [];
    if (options?.detectTechnologies !== false) {
      const metaGen = doc.querySelector('meta[name="generator"]')?.getAttribute("content") || "";
      if (metaGen) technologies.push(metaGen);
      const scripts = Array.from(doc.querySelectorAll("script[src]")).map((s) => s.getAttribute("src") || "");
      const links = Array.from(doc.querySelectorAll("link[href]")).map((l) => l.getAttribute("href") || "");
      const combinedHtml = (doc.head ? doc.head.innerHTML : "") + (doc.body ? doc.body.innerHTML.slice(0, 1e4) : "");
      const signatures = {
        "Shopify": /cdn\.shopify\.com|Shopify\.theme|ShopifyAnalytics/i,
        "WordPress": /wp-content|wp-includes/i,
        "WooCommerce": /woocommerce/i,
        "Webflow": /webflow\.com|wf-page/i,
        "Wix": /wix\.com|wix-site/i,
        "Squarespace": /squarespace\.com|static1\.squarespace/i,
        "Next.js": /__NEXT_DATA__|_next\/static/i,
        "Nuxt.js": /__NUXT__|_nuxt/i,
        "Google Tag Manager": /googletagmanager\.com\/gtm\.js/i,
        "Google Analytics": /google-analytics\.com|googletagmanager\.com\/gtag/i,
        "Facebook Pixel": /connect\.facebook\.net/i,
        "Stripe": /js\.stripe\.com/i,
        "Hotjar": /static\.hotjar\.com/i,
        "HubSpot": /js\.hs-scripts\.com/i,
        "Intercom": /widget\.intercom\.io/i,
        "Klaviyo": /static\.klaviyo\.com/i,
        "Cloudflare": /cdnjs\.cloudflare\.com|cloudflare/i
      };
      for (const [techName, regex] of Object.entries(signatures)) {
        if (regex.test(combinedHtml) || scripts.some((s) => regex.test(s)) || links.some((l) => regex.test(l))) {
          technologies.push(techName);
        }
      }
    }
    const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content");
    const appName = doc.querySelector('meta[name="application-name"]')?.getAttribute("content");
    let companyName = ogSiteName || appName || void 0;
    if (!companyName && doc.title) {
      const parts = doc.title.split(/[|\-–—]/);
      companyName = parts[0].trim() || void 0;
    }
    const profile = {
      domain,
      companyName: companyName || void 0,
      emails: Array.from(emails).slice(0, 50),
      phoneNumbers: Array.from(phoneNumbers).slice(0, 30),
      socialLinks,
      dns: {
        mxRecords: [],
        txtRecords: [],
        hasGoogleWorkspace: technologies.includes("Google Workspace"),
        hasMicrosoft365: technologies.includes("Microsoft 365")
      },
      serverInfo: {
        cdnOrWaf: technologies.includes("Cloudflare") ? "Cloudflare" : "None"
      },
      technologies: Array.from(new Set(technologies))
    };
    return {
      success: true,
      data: profile,
      durationMs: Date.now() - startTime,
      metadata: {
        emailsFound: profile.emails.length,
        phonesFound: profile.phoneNumbers.length,
        technologiesFound: profile.technologies.length
      }
    };
  }
  isValidEmail(email) {
    if (!email || email.length < 5 || email.length > 100) return false;
    if (INVALID_EMAIL_EXTS.some((ext) => email.endsWith(ext))) return false;
    const domain = email.split("@")[1];
    if (!domain || IGNORED_EMAIL_DOMAINS.includes(domain)) return false;
    return true;
  }
};

// ../../packages/core/src/browser/TechnicalAuditorEngine.ts
var TechnicalAuditorEngine = class {
  name = "TechnicalAuditorEngine";
  async extract(options) {
    const startTime = Date.now();
    const doc = options?.document ?? (typeof document !== "undefined" ? document : void 0);
    if (!doc) {
      return {
        success: false,
        error: new ExtractionError({
          code: "EMPTY_TARGET" /* EMPTY_TARGET */,
          message: "No DOM document available for Technical Audit"
        }),
        durationMs: Date.now() - startTime
      };
    }
    const targetUrl = options?.url || (doc.location ? doc.location.href : "");
    const issues = [];
    let complianceScore = 100;
    const meta = this.auditMeta(doc, issues);
    let performanceInfo;
    if (options?.checkPerformance !== false && typeof performance !== "undefined") {
      performanceInfo = this.auditPerformance(issues);
    }
    let securityHeaders = { headersAvailable: false };
    if (options?.fetchHeadHeaders !== false && targetUrl && targetUrl.startsWith("http")) {
      securityHeaders = await this.auditSecurityHeaders(targetUrl, issues);
    }
    for (const issue of issues) {
      if (issue.severity === "ERROR") complianceScore -= 15;
      else if (issue.severity === "WARN") complianceScore -= 7;
      else if (issue.severity === "INFO") complianceScore -= 3;
    }
    complianceScore = Math.max(0, Math.min(100, complianceScore));
    const report = {
      targetUrl,
      meta,
      performance: performanceInfo,
      securityHeaders,
      complianceScore,
      issues
    };
    return {
      success: true,
      data: report,
      durationMs: Date.now() - startTime,
      metadata: {
        issuesCount: issues.length,
        complianceScore
      }
    };
  }
  auditMeta(doc, issues) {
    const charset = doc.characterSet || doc.querySelector("meta[charset]")?.getAttribute("charset") || void 0;
    if (!charset) {
      issues.push({
        severity: "WARN",
        code: "META_CHARSET_MISSING",
        message: "No se detect\xF3 etiqueta meta charset en el documento."
      });
    }
    const viewport = doc.querySelector('meta[name="viewport"]')?.getAttribute("content") || void 0;
    if (!viewport) {
      issues.push({
        severity: "ERROR",
        code: "META_VIEWPORT_MISSING",
        message: "Falta la etiqueta meta viewport para dise\xF1o responsivo m\xF3vil."
      });
    }
    const titleTag = doc.querySelector("title");
    const title = doc.title || (titleTag ? titleTag.textContent || "" : "");
    const titleLength = title.trim().length;
    if (titleLength === 0) {
      issues.push({
        severity: "ERROR",
        code: "TITLE_MISSING",
        message: "La p\xE1gina no tiene t\xEDtulo definido (<title> vac\xEDo o ausente)."
      });
    } else if (titleLength < 20) {
      issues.push({
        severity: "WARN",
        code: "TITLE_TOO_SHORT",
        message: `El t\xEDtulo es demasiado corto (${titleLength} caracteres, recomendado 30-60).`
      });
    } else if (titleLength > 70) {
      issues.push({
        severity: "INFO",
        code: "TITLE_TOO_LONG",
        message: `El t\xEDtulo supera los 70 caracteres (${titleLength}), podr\xEDa ser truncado en SERP.`
      });
    }
    const description = doc.querySelector('meta[name="description"]')?.getAttribute("content") || void 0;
    const descriptionLength = description ? description.trim().length : 0;
    if (!description) {
      issues.push({
        severity: "WARN",
        code: "META_DESC_MISSING",
        message: "No existe meta description para snippets de b\xFAsqueda."
      });
    } else if (descriptionLength < 50) {
      issues.push({
        severity: "INFO",
        code: "META_DESC_TOO_SHORT",
        message: `Meta description corta (${descriptionLength} caracteres, recomendado 70-160).`
      });
    }
    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || void 0;
    if (!canonical) {
      issues.push({
        severity: "WARN",
        code: "CANONICAL_MISSING",
        message: 'Falta etiqueta <link rel="canonical"> para prevenir contenido duplicado.'
      });
    }
    const robots = doc.querySelector('meta[name="robots"]')?.getAttribute("content") || void 0;
    if (robots && robots.toLowerCase().includes("noindex")) {
      issues.push({
        severity: "WARN",
        code: "ROBOTS_NOINDEX",
        message: "La p\xE1gina tiene meta robots con directiva noindex."
      });
    }
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || void 0;
    const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute("content") || void 0;
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || void 0;
    const ogUrl = doc.querySelector('meta[property="og:url"]')?.getAttribute("content") || void 0;
    const ogType = doc.querySelector('meta[property="og:type"]')?.getAttribute("content") || void 0;
    const missingRequiredTags = [];
    if (!ogTitle) missingRequiredTags.push("og:title");
    if (!ogImage) missingRequiredTags.push("og:image");
    if (!ogUrl) missingRequiredTags.push("og:url");
    if (missingRequiredTags.length > 0) {
      issues.push({
        severity: "INFO",
        code: "OG_TAGS_INCOMPLETE",
        message: `Etiquetas OpenGraph faltantes: ${missingRequiredTags.join(", ")}.`
      });
    }
    const twCard = doc.querySelector('meta[name="twitter:card"]')?.getAttribute("content") || void 0;
    const twTitle = doc.querySelector('meta[name="twitter:title"]')?.getAttribute("content") || void 0;
    const twDesc = doc.querySelector('meta[name="twitter:description"]')?.getAttribute("content") || void 0;
    const twImage = doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content") || void 0;
    const favicon = doc.querySelector('link[rel*="icon"]')?.getAttribute("href") || void 0;
    if (!favicon) {
      issues.push({
        severity: "INFO",
        code: "FAVICON_MISSING",
        message: 'No se detect\xF3 link rel="icon" en el documento.'
      });
    }
    return {
      charset,
      viewport,
      title,
      titleLength,
      description,
      descriptionLength,
      canonical,
      robots,
      openGraph: {
        title: ogTitle,
        description: ogDesc,
        image: ogImage,
        url: ogUrl,
        type: ogType,
        missingRequiredTags
      },
      twitter: {
        card: twCard,
        title: twTitle,
        description: twDesc,
        image: twImage
      },
      favicon
    };
  }
  auditPerformance(issues) {
    try {
      const navEntries = performance.getEntriesByType("navigation");
      if (!navEntries || navEntries.length === 0) return void 0;
      const entry = navEntries[0];
      const ttfbMs = Math.max(0, Math.round(entry.responseStart - entry.requestStart));
      const dnsTimeMs = Math.max(0, Math.round(entry.domainLookupEnd - entry.domainLookupStart));
      const tcpTimeMs = Math.max(0, Math.round(entry.connectEnd - entry.connectStart));
      const domContentLoadedMs = Math.max(0, Math.round(entry.domContentLoadedEventEnd - entry.startTime));
      const loadCompleteMs = Math.max(0, Math.round(entry.loadEventEnd - entry.startTime));
      const transferSizeBytes = entry.transferSize || 0;
      const decodedBodySizeBytes = entry.decodedBodySize || 0;
      if (ttfbMs > 800) {
        issues.push({
          severity: "WARN",
          code: "PERF_HIGH_TTFB",
          message: `Time to First Byte elevado: ${ttfbMs}ms (meta recomendada < 600ms).`
        });
      }
      return {
        ttfbMs,
        dnsTimeMs,
        tcpTimeMs,
        domContentLoadedMs,
        loadCompleteMs,
        transferSizeBytes,
        decodedBodySizeBytes
      };
    } catch {
      return void 0;
    }
  }
  async auditSecurityHeaders(targetUrl, issues) {
    try {
      const res = await fetch(targetUrl, {
        method: "HEAD",
        credentials: "include"
      });
      const headers = res.headers;
      const hsts = headers.get("strict-transport-security") || void 0;
      const csp = headers.get("content-security-policy") || void 0;
      const xfo = headers.get("x-frame-options") || void 0;
      const xcto = headers.get("x-content-type-options") || void 0;
      const refPolicy = headers.get("referrer-policy") || void 0;
      const server = headers.get("server") || void 0;
      const xpb = headers.get("x-powered-by") || void 0;
      if (targetUrl.startsWith("https://") && !hsts) {
        issues.push({
          severity: "WARN",
          code: "SEC_HSTS_MISSING",
          message: "Falta cabecera Strict-Transport-Security (HSTS) en conexi\xF3n HTTPS."
        });
      }
      if (!csp) {
        issues.push({
          severity: "WARN",
          code: "SEC_CSP_MISSING",
          message: "Falta cabecera Content-Security-Policy (CSP) para mitigar XSS."
        });
      }
      if (!xcto) {
        issues.push({
          severity: "INFO",
          code: "SEC_XCTO_MISSING",
          message: "Falta X-Content-Type-Options: nosniff para prevenir MIME-sniffing."
        });
      }
      if (server || xpb) {
        issues.push({
          severity: "INFO",
          code: "SEC_BANNER_LEAK",
          message: `Cabecera informativa expuesta: ${server ? `Server=${server}` : ""} ${xpb ? `X-Powered-By=${xpb}` : ""}`.trim()
        });
      }
      return {
        strictTransportSecurity: hsts,
        contentSecurityPolicy: csp,
        xFrameOptions: xfo,
        xContentTypeOptions: xcto,
        referrerPolicy: refPolicy,
        server,
        xPoweredBy: xpb,
        headersAvailable: true
      };
    } catch (err) {
      return {
        headersAvailable: false,
        headFetchError: err instanceof Error ? err.message : String(err)
      };
    }
  }
};

// ../../packages/core/src/browser/presets-registry.ts
var PRESETS_CATALOG = [
  {
    id: "001-universal-ecommerce-product",
    slug: "jsonld-product",
    name: "Universal E-Commerce Product",
    description: "Extrae Schema.org Product, precios, moneda, SKU y disponibilidad desde scripts JSON-LD en el DOM.",
    category: "ecommerce",
    engine: "EcommerceJsonLdEngine",
    tier: "FREE",
    icon: "shopping-cart",
    tags: ["ecommerce", "products", "json-ld", "schema.org"],
    aliases: ["001-universal-ecommerce-product-extractor", "universal-ecommerce-product"]
  },
  {
    id: "002-shopify-full-catalog-scraper",
    slug: "shopify-catalog",
    name: "Shopify Full Catalog Scraper",
    description: "Extrae cat\xE1logo completo, productos, precios, SKU y variantes desde tiendas Shopify.",
    category: "ecommerce",
    engine: "EcommerceJsonLdEngine",
    tier: "FREE",
    icon: "shopping-bag",
    tags: ["shopify", "ecommerce", "catalog", "scraper"],
    aliases: ["shopify-full-catalog-scraper", "008-ssr-shopify-state", "shopify-state"]
  },
  {
    id: "004-mercadolibre-product-seller-intelligence",
    slug: "mercadolibre-intelligence",
    name: "Mercado Libre Product & Seller Intelligence",
    description: "Extrae fichas de producto, precios, reputaci\xF3n del vendedor y stock en Mercado Libre.",
    category: "ecommerce",
    engine: "EcommerceJsonLdEngine",
    tier: "FREE",
    icon: "tag",
    tags: ["mercadolibre", "meli", "marketplace", "seller"],
    aliases: ["mercadolibre-product-seller-intelligence"]
  },
  {
    id: "003-nextjs-ssr-hydration",
    slug: "nextjs-hydration",
    name: "Next.js & Nuxt SSR State Extractor",
    description: "Extrae el estado pre-renderizado del servidor (__NEXT_DATA__, __NUXT_DATA__) con las props.",
    category: "hydration",
    engine: "SSRHydrationEngine",
    tier: "FREE",
    icon: "code",
    tags: ["nextjs", "nuxt", "ssr", "hydration", "props"],
    aliases: ["007-ssr-state-extractor", "ssr-hydration"]
  },
  {
    id: "005-b2b-contact-leads",
    slug: "b2b-contact-leads",
    name: "B2B Website Contact & Leads Extractor",
    description: "Detecta emails corporativos, enlaces directos a WhatsApp, tel\xE9fonos y redes sociales en el DOM.",
    category: "leads",
    engine: "B2BEnricherEngine",
    tier: "FREE",
    icon: "users",
    tags: ["b2b", "leads", "emails", "whatsapp", "contacts"],
    aliases: ["003-b2b-lead-scanner", "b2b-leads"]
  },
  {
    id: "002-ecommerce-variants-matrix",
    slug: "ecommerce-variants",
    name: "E-Commerce Variant Matrix & Offers",
    description: "Extrae matriz completa de variantes, talles, colores y precios m\xFAltiples por oferta.",
    category: "ecommerce",
    engine: "EcommerceJsonLdEngine",
    tier: "PRO",
    icon: "grid",
    tags: ["ecommerce", "variants", "pricing", "pro"],
    defaultOptions: { extractVariants: true, includeRawLdJson: true }
  },
  {
    id: "003-b2b-lead-scanner",
    slug: "b2b-leads",
    name: "B2B Lead & Contact Scanner",
    description: "Detecta emails p\xFAblicos, enlaces directos a WhatsApp, tel\xE9fonos y redes sociales en el DOM.",
    category: "leads",
    engine: "B2BEnricherEngine",
    tier: "FREE",
    icon: "users",
    tags: ["b2b", "leads", "emails", "whatsapp", "contacts"]
  },
  {
    id: "004-b2b-full-tech-stack",
    slug: "tech-stack-audit",
    name: "B2B Tech Stack & Pixel Detector",
    description: "Audita CMS, e-commerce backend, trackers (GA4, GTM, Pixel, Hotjar) y CDNs activas.",
    category: "leads",
    engine: "B2BEnricherEngine",
    tier: "PRO",
    icon: "cpu",
    tags: ["b2b", "technologies", "pixels", "cms", "pro"],
    defaultOptions: { detectTechnologies: true }
  },
  {
    id: "005-ai-markdown-clean",
    slug: "ai-markdown",
    name: "Clean AI Markdown Reader",
    description: "Convierte el contenido sem\xE1ntico del sitio en Markdown limpio sin men\xFAs ni publicidad.",
    category: "content",
    engine: "AIMarkdownEngine",
    tier: "FREE",
    icon: "file-text",
    tags: ["ai", "markdown", "llm", "rag", "clean"]
  },
  {
    id: "006-ai-markdown-rag-chunks",
    slug: "ai-rag-chunks",
    name: "RAG Embeddings Chunk Generator",
    description: "Segmenta el contenido en chunks optimizados con estimaci\xF3n de tokens para bases vectoriales.",
    category: "content",
    engine: "AIMarkdownEngine",
    tier: "PRO",
    icon: "layers",
    tags: ["rag", "embeddings", "chunks", "vector", "pro"],
    defaultOptions: {
      chunking: { enabled: true, maxChunkSize: 1e3, chunkOverlap: 150 }
    }
  },
  {
    id: "007-ssr-state-extractor",
    slug: "ssr-hydration",
    name: "Next.js & Nuxt SSR State Extractor",
    description: "Extrae __NEXT_DATA__ o __NUXT_DATA__ con las props deserializadas del servidor.",
    category: "hydration",
    engine: "SSRHydrationEngine",
    tier: "FREE",
    icon: "code",
    tags: ["nextjs", "nuxtjs", "ssr", "hydration", "props"]
  },
  {
    id: "008-ssr-shopify-state",
    slug: "shopify-state",
    name: "Shopify Storefront State (MAIN World)",
    description: "Lee el estado window.Shopify, tema, moneda y colecciones activas en contexto de p\xE1gina.",
    category: "hydration",
    engine: "SSRHydrationEngine",
    tier: "FREE",
    icon: "shopping-bag",
    tags: ["shopify", "storefront", "theme", "state"]
  },
  {
    id: "009-technical-seo-audit",
    slug: "seo-audit",
    name: "Technical SEO & Meta Tags Auditor",
    description: "Verifica t\xEDtulo, descripci\xF3n, robots, etiquetas can\xF3nicas y tarjetas OpenGraph/Twitter.",
    category: "audit",
    engine: "TechnicalAuditorEngine",
    tier: "FREE",
    icon: "search",
    tags: ["seo", "meta", "opengraph", "canonical"]
  },
  {
    id: "010-security-headers-audit",
    slug: "security-audit",
    name: "Security Headers & Performance Navigation",
    description: "Inspecciona HSTS, CSP, X-Frame-Options mediante HEAD same-origin y m\xE9tricas de Navigation Timing.",
    category: "audit",
    engine: "TechnicalAuditorEngine",
    tier: "PRO",
    icon: "shield-check",
    tags: ["security", "headers", "hsts", "csp", "performance", "pro"],
    defaultOptions: { fetchHeadHeaders: true, checkPerformance: true }
  }
];
function getAllPresets() {
  return [...PRESETS_CATALOG];
}
function getPresetByIdOrSlug(idOrSlug) {
  const query = idOrSlug.trim().toLowerCase();
  return PRESETS_CATALOG.find(
    (p) => p.id.toLowerCase() === query || p.slug.toLowerCase() === query || p.aliases?.some((a) => a.toLowerCase() === query)
  );
}
function getPresetsByCategory(category) {
  return PRESETS_CATALOG.filter((p) => p.category === category);
}
function searchPresets(query) {
  const q = query.trim().toLowerCase();
  if (!q) return getAllPresets();
  return PRESETS_CATALOG.filter(
    (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.tags.some((tag) => tag.toLowerCase().includes(q)) || p.aliases?.some((a) => a.toLowerCase() === q)
  );
}

// ../../packages/core/src/browser/contextual-detector.ts
var CONTEXTUAL_PRESET_IDS = {
  SHOPIFY: "002-shopify-full-catalog-scraper",
  MERCADOLIBRE: "004-mercadolibre-product-seller-intelligence",
  SCHEMA_ECOMMERCE: "001-universal-ecommerce-product",
  NEXTJS_SSR: "003-nextjs-ssr-hydration",
  B2B_LEADS: "005-b2b-contact-leads"
};
function detectContextualPreset(url, htmlSnippet) {
  return detectContextualPresetSignal(url, htmlSnippet).presetId;
}
function detectContextualPresetSignal(url, htmlSnippet) {
  const rawUrl = (url || "").trim().toLowerCase();
  const snippet = (htmlSnippet || "").toLowerCase();
  if (rawUrl.includes("mercadolibre.") || rawUrl.includes("articulo.mercadolibre.") || rawUrl.includes("mercadolivre.") || snippet.includes("mercadolibre.com") || snippet.includes("mercadolivre.com")) {
    return {
      presetId: CONTEXTUAL_PRESET_IDS.MERCADOLIBRE,
      confidence: "high",
      reason: "Mercado Libre / Mercado Livre marketplace domain or brand detected"
    };
  }
  const isShopifyUrl = rawUrl.includes("/products/") || rawUrl.includes("myshopify.com");
  const isShopifySnippet = snippet.includes("shopify-digital-wallet") || snippet.includes("window.shopify") || snippet.includes("shopify.shop") || snippet.includes("cdn.shopify.com");
  if (isShopifyUrl || isShopifySnippet) {
    return {
      presetId: CONTEXTUAL_PRESET_IDS.SHOPIFY,
      confidence: "high",
      reason: "Shopify storefront detected via URL or DOM meta/scripts"
    };
  }
  const hasJsonLd = snippet.includes("application/ld+json");
  const hasProductSchema = snippet.includes('"product"') || snippet.includes("'product'") || snippet.includes("schema.org/product") || snippet.includes("schema.org/offer");
  if (hasJsonLd && (hasProductSchema || snippet.includes("schema.org"))) {
    return {
      presetId: CONTEXTUAL_PRESET_IDS.SCHEMA_ECOMMERCE,
      confidence: "high",
      reason: "Schema.org JSON-LD Product or Offer markup found in DOM"
    };
  }
  const isNext = snippet.includes("__next_data__") || snippet.includes("_next/static");
  const isNuxt = snippet.includes("__nuxt_data__") || snippet.includes("__nuxt__") || snippet.includes("/_nuxt/");
  if (isNext || isNuxt) {
    return {
      presetId: CONTEXTUAL_PRESET_IDS.NEXTJS_SSR,
      confidence: "medium",
      reason: isNext ? "Next.js SSR hydration tag (__NEXT_DATA__) detected" : "Nuxt.js SSR state detected"
    };
  }
  return {
    presetId: CONTEXTUAL_PRESET_IDS.B2B_LEADS,
    confidence: "low",
    reason: "General web page, defaulting to B2B contact and leads enrichment"
  };
}

// ../../packages/core/src/browser/export-formatters.ts
function escapeCsvCell(value) {
  if (value === null || value === void 0) {
    return "";
  }
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
function exportToCsv(data) {
  if (data === null || data === void 0) {
    return "";
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return "";
    const hasObjects = data.some((item) => item !== null && typeof item === "object");
    if (!hasObjects) {
      return data.map((item) => escapeCsvCell(item)).join("\r\n");
    }
    const headers = [];
    for (const item of data) {
      if (item && typeof item === "object") {
        for (const key of Object.keys(item)) {
          if (!headers.includes(key)) {
            headers.push(key);
          }
        }
      }
    }
    const headerLine = headers.map(escapeCsvCell).join(",");
    const rowLines = data.map((item) => {
      if (!item || typeof item !== "object") {
        return escapeCsvCell(item);
      }
      const record = item;
      return headers.map((h) => escapeCsvCell(record[h])).join(",");
    });
    return [headerLine, ...rowLines].join("\r\n");
  }
  if (typeof data === "object") {
    const rows = ["key,value"];
    for (const [k, v] of Object.entries(data)) {
      rows.push(`${escapeCsvCell(k)},${escapeCsvCell(v)}`);
    }
    return rows.join("\r\n");
  }
  return escapeCsvCell(data);
}
function formatTsvValue(value) {
  if (value === null || value === void 0) {
    return "";
  }
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  return str.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}
function exportToTsv(data) {
  if (data === null || data === void 0) {
    return "";
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return "";
    const hasObjects = data.some((item) => item !== null && typeof item === "object");
    if (!hasObjects) {
      return data.map((item) => formatTsvValue(item)).join("\n");
    }
    const headers = [];
    for (const item of data) {
      if (item && typeof item === "object") {
        for (const key of Object.keys(item)) {
          if (!headers.includes(key)) {
            headers.push(key);
          }
        }
      }
    }
    const headerLine = headers.join("	");
    const rowLines = data.map((item) => {
      if (!item || typeof item !== "object") {
        return formatTsvValue(item);
      }
      const record = item;
      return headers.map((h) => formatTsvValue(record[h])).join("	");
    });
    return [headerLine, ...rowLines].join("\n");
  }
  if (typeof data === "object") {
    const rows = ["Campo	Valor"];
    for (const [k, v] of Object.entries(data)) {
      rows.push(`${formatTsvValue(k)}	${formatTsvValue(v)}`);
    }
    return rows.join("\n");
  }
  return formatTsvValue(data);
}
function exportToJson(data, pretty = true) {
  return JSON.stringify(data ?? null, null, pretty ? 2 : 0);
}

// ../../packages/core/src/browser/deep-link-bridge.ts
var DEFAULT_ZABREUIT_EXTENSION_ID = "pbehnfdffoiaomokjafhckgbfmbfgbom";
var CHROME_WEB_STORE_BASE_URL = "https://chromewebstore.google.com/detail";
function getChromeStoreInstallUrl(extensionId = DEFAULT_ZABREUIT_EXTENSION_ID, utmSource = "seo_landing") {
  return `${CHROME_WEB_STORE_BASE_URL}/${extensionId}?utm_source=${encodeURIComponent(utmSource)}`;
}
async function pingExtension(options) {
  const extensionId = options?.extensionId || DEFAULT_ZABREUIT_EXTENSION_ID;
  const timeoutMs = options?.timeoutMs ?? 350;
  const runtime = options?.chromeRuntime || typeof window !== "undefined" && window.chrome?.runtime;
  if (!runtime || typeof runtime.sendMessage !== "function") {
    return null;
  }
  try {
    const pingPromise = new Promise((resolve) => {
      try {
        runtime.sendMessage(extensionId, { type: "PING" }, (res) => {
          if (runtime.lastError || !res || typeof res !== "object") {
            resolve(null);
          } else {
            resolve(res);
          }
        });
      } catch {
        resolve(null);
      }
    });
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    });
    return await Promise.race([pingPromise, timeoutPromise]);
  } catch {
    return null;
  }
}
async function sendLaunchPreset(options) {
  const extensionId = options.extensionId || DEFAULT_ZABREUIT_EXTENSION_ID;
  const runtime = options.chromeRuntime || typeof window !== "undefined" && window.chrome?.runtime;
  if (!runtime || typeof runtime.sendMessage !== "function") {
    return false;
  }
  return new Promise((resolve) => {
    try {
      runtime.sendMessage(
        extensionId,
        {
          type: "LAUNCH_PRESET",
          presetId: options.presetId,
          slug: options.slug
        },
        () => {
          resolve(!runtime.lastError);
        }
      );
    } catch {
      resolve(false);
    }
  });
}
async function setupDeepLinkBridge(options = {}) {
  const extensionId = options.extensionId || DEFAULT_ZABREUIT_EXTENSION_ID;
  const timeoutMs = options.timeoutMs ?? 350;
  const utmSource = options.utmSource || "seo_landing";
  const fallbackUrl = getChromeStoreInstallUrl(extensionId, utmSource);
  const openFallback = () => {
    if (options.openUrl) {
      options.openUrl(fallbackUrl, "_blank");
    } else if (typeof window !== "undefined" && typeof window.open === "function") {
      window.open(fallbackUrl, "_blank");
    }
  };
  const response = await pingExtension({
    extensionId,
    timeoutMs,
    chromeRuntime: options.chromeRuntime
  });
  if (response && response.status === "PONG") {
    const text = "Ejecutar Preset";
    if (options.button) {
      options.button.innerText = text;
      options.button.onclick = () => {
        if (options.presetId) {
          sendLaunchPreset({
            presetId: options.presetId,
            slug: options.slug,
            extensionId,
            chromeRuntime: options.chromeRuntime
          });
        }
      };
    }
    return {
      connected: true,
      buttonText: text,
      action: "LAUNCH_PRESET"
    };
  }
  const fallbackText = "Instalar Extensi\xF3n en Chrome (Gratis)";
  if (options.button) {
    options.button.innerText = fallbackText;
    options.button.onclick = openFallback;
  }
  return {
    connected: false,
    buttonText: fallbackText,
    action: "INSTALL_FALLBACK",
    targetUrl: fallbackUrl
  };
}

// ../../packages/core/src/browser/license-verifier.ts
var DEFAULT_ED25519_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAPDKGZKGybKTZBEP6YKZJ2CeaH7Xtc5N7au4NzyHDyLM=
-----END PUBLIC KEY-----`;
function base64UrlEncode(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
function pemToDer(pem) {
  const clean = pem.replace(/-----[^\n]+-----/g, "").replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
function derToPem(der, label) {
  const bytes = der instanceof Uint8Array ? der : new Uint8Array(der);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  const chunks = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----
${chunks.join("\n")}
-----END ${label}-----`;
}
async function sha256Hex(data) {
  const bytes = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function verifyLicenseToken(tokenString, publicKeyPem = DEFAULT_ED25519_PUBLIC_KEY_PEM) {
  try {
    if (!tokenString || typeof tokenString !== "string") {
      return { valid: false, error: "MALFORMED_TOKEN" };
    }
    const parts = tokenString.trim().split(".");
    if (parts.length !== 2) {
      return { valid: false, error: "MALFORMED_TOKEN" };
    }
    const [payloadB64, signatureB64] = parts;
    if (!payloadB64 || !signatureB64) {
      return { valid: false, error: "MALFORMED_TOKEN" };
    }
    const payloadBuffer = base64UrlDecode(payloadB64);
    const signatureBuffer = base64UrlDecode(signatureB64);
    let payload;
    try {
      const jsonText = new TextDecoder().decode(payloadBuffer);
      payload = JSON.parse(jsonText);
    } catch {
      return { valid: false, error: "MALFORMED_TOKEN" };
    }
    if (!payload || typeof payload !== "object" || !payload.sub || !payload.exp) {
      return { valid: false, error: "MALFORMED_TOKEN" };
    }
    const now = Math.floor(Date.now() / 1e3);
    if (payload.exp < now) {
      return { valid: false, error: "TOKEN_EXPIRED" };
    }
    const der = pemToDer(publicKeyPem);
    const cryptoKey = await crypto.subtle.importKey(
      "spki",
      der,
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    const isSignatureValid = await crypto.subtle.verify(
      "Ed25519",
      cryptoKey,
      signatureBuffer,
      payloadBuffer
    );
    if (!isSignatureValid) {
      return { valid: false, error: "INVALID_SIGNATURE" };
    }
    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}
async function signLicensePayload(payload, privateKeyPem) {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const der = pemToDer(privateKeyPem);
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "Ed25519" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("Ed25519", privateKey, payloadBytes);
  const payloadB64 = base64UrlEncode(payloadBytes);
  const signatureB64 = base64UrlEncode(signature);
  return `${payloadB64}.${signatureB64}`;
}
async function generateEd25519KeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"]
  );
  const spkiDer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const pkcs8Der = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  return {
    publicKeyPem: derToPem(spkiDer, "PUBLIC KEY"),
    privateKeyPem: derToPem(pkcs8Der, "PRIVATE KEY"),
    keyPair
  };
}

// ../../packages/core/src/browser/index.ts
async function runBrowserPreset(presetIdOrSlug, options) {
  const preset = getPresetByIdOrSlug(presetIdOrSlug);
  if (!preset) {
    return {
      success: false,
      error: new ExtractionError({
        code: "SCHEMA_MISMATCH" /* SCHEMA_MISMATCH */,
        message: `Preset not found: ${presetIdOrSlug}`
      }),
      durationMs: 0
    };
  }
  const mergedOptions = { ...preset.defaultOptions, ...options };
  switch (preset.engine) {
    case "EcommerceJsonLdEngine": {
      const engine = new EcommerceJsonLdEngine();
      return engine.extract(mergedOptions);
    }
    case "SSRHydrationEngine": {
      const engine = new SSRHydrationEngine();
      return engine.extract(mergedOptions);
    }
    case "AIMarkdownEngine": {
      const engine = new AIMarkdownEngine();
      return engine.extract(mergedOptions);
    }
    case "B2BEnricherEngine": {
      const engine = new B2BEnricherEngine();
      return engine.extract(mergedOptions);
    }
    case "TechnicalAuditorEngine": {
      const engine = new TechnicalAuditorEngine();
      return await engine.extract(mergedOptions);
    }
    default: {
      return {
        success: false,
        error: new ExtractionError({
          code: "SCHEMA_MISMATCH" /* SCHEMA_MISMATCH */,
          message: `Unsupported engine: ${preset.engine}`
        }),
        durationMs: 0
      };
    }
  }
}
export {
  AIMarkdownEngine,
  B2BEnricherEngine,
  CHROME_WEB_STORE_BASE_URL,
  CONTEXTUAL_PRESET_IDS,
  DEFAULT_ED25519_PUBLIC_KEY_PEM,
  DEFAULT_ZABREUIT_EXTENSION_ID,
  EcommerceJsonLdEngine,
  PRESETS_CATALOG,
  SSRHydrationEngine,
  TechnicalAuditorEngine,
  base64UrlDecode,
  base64UrlEncode,
  derToPem,
  detectContextualPreset,
  detectContextualPresetSignal,
  escapeCsvCell,
  exportToCsv,
  exportToJson,
  exportToTsv,
  formatTsvValue,
  generateEd25519KeyPair,
  getAllPresets,
  getChromeStoreInstallUrl,
  getPresetByIdOrSlug,
  getPresetsByCategory,
  pemToDer,
  pingExtension,
  runBrowserPreset,
  searchPresets,
  sendLaunchPreset,
  setupDeepLinkBridge,
  sha256Hex,
  signLicensePayload,
  verifyLicenseToken
};
