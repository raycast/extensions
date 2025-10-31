import { useState, useEffect } from "react";
import { Color } from "@raycast/api";
import { Movie, Torrent } from "./types";
import { QUALITY_ORDER } from "./constants";
import { getCurrentTrackers } from "./trackers";

export function generateMagnetLink(torrent: Torrent, movieTitle: string, year: number): string {
  const yearText = year && year > 0 ? year : "Unknown";
  const name = encodeURIComponent(`${movieTitle} ${yearText} [${torrent.quality}] [YTS.MX]`);

  // Get current trackers (from cache or fallback)
  const trackers = getCurrentTrackers();

  const trackersString = trackers.map((t) => `&tr=${encodeURIComponent(t)}`).join("");
  return `magnet:?xt=urn:btih:${torrent.hash}&dn=${name}${trackersString}`;
}

export function getYTSUrl(movie: Movie): string {
  const title = movie.title || movie.title_english || "unknown";
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const year = movie.year && movie.year > 0 ? movie.year : "0000";
  return `https://yts.mx/movies/${slug}-${year}`;
}

export function getIMDbUrl(imdbCode: string): string {
  return `https://www.imdb.com/title/${imdbCode}`;
}

export function getRottenTomatoesUrl(movieTitle: string): string {
  // Rotten Tomatoes URL structure is not as predictable, but we can try to construct it
  const title = movieTitle || "unknown";
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, ""); // Remove leading/trailing underscores

  return `https://www.rottentomatoes.com/m/${slug}`;
}

export function getRottenTomatoesSearchUrl(movieTitle: string): string {
  // Fallback to search if direct URL doesn't work
  return `https://www.rottentomatoes.com/search?search=${encodeURIComponent(movieTitle)}`;
}

export function getPlexSearchUrl(movieTitle: string): string {
  // Plex search URL with properly encoded search query
  const searchQuery = encodeURIComponent(movieTitle);
  return `https://app.plex.tv/desktop/#!/search?query=${searchQuery}`;
}

export function formatFileSize(bytes: number): string {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Bytes";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
}

export function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function getProxiedImageUrl(originalUrl: string): string {
  // Safety check for undefined/null URLs
  if (!originalUrl || typeof originalUrl !== "string") {
    return "";
  }

  // Extract the image path from the YTS URL
  const match = originalUrl.match(/https:\/\/yts\.mx\/assets\/images\/(.+)/);
  if (match) {
    // Route through our Cloudflare Worker image proxy
    return `https://yts-proxy-worker.stan-1ca.workers.dev/images/${match[1]}`;
  }
  // Fallback to original URL if pattern doesn't match
  return originalUrl;
}

export function getLanguageName(languageCode: string): string {
  const languageMap: { [key: string]: string } = {
    en: "English",
    fr: "French",
    es: "Spanish",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    cn: "Chinese",
    ar: "Arabic",
    hi: "Hindi",
    th: "Thai",
    tr: "Turkish",
    pl: "Polish",
    nl: "Dutch",
    sv: "Swedish",
    da: "Danish",
    no: "Norwegian",
    fi: "Finnish",
    cs: "Czech",
    hu: "Hungarian",
    ro: "Romanian",
    bg: "Bulgarian",
    hr: "Croatian",
    sr: "Serbian",
    sk: "Slovak",
    sl: "Slovenian",
    et: "Estonian",
    lv: "Latvian",
    lt: "Lithuanian",
    mt: "Maltese",
    el: "Greek",
    he: "Hebrew",
    fa: "Persian",
    ur: "Urdu",
    bn: "Bengali",
    ta: "Tamil",
    te: "Telugu",
    ml: "Malayalam",
    kn: "Kannada",
    gu: "Gujarati",
    pa: "Punjabi",
    mr: "Marathi",
    vi: "Vietnamese",
    id: "Indonesian",
    ms: "Malay",
    tl: "Filipino",
    sw: "Swahili",
    am: "Amharic",
    yo: "Yoruba",
    ig: "Igbo",
    ha: "Hausa",
    zu: "Zulu",
    af: "Afrikaans",
    xh: "Xhosa",
    st: "Sotho",
    tn: "Tswana",
    ss: "Swati",
    ts: "Tsonga",
    ve: "Venda",
    nr: "Ndebele",
    nso: "Northern Sotho",
    uk: "Ukrainian",
    be: "Belarusian",
    is: "Icelandic",
    ga: "Irish",
    cy: "Welsh",
    eu: "Basque",
    ca: "Catalan",
    gl: "Galician",
    sq: "Albanian",
    mk: "Macedonian",
    bs: "Bosnian",
    me: "Montenegrin",
    kk: "Kazakh",
    ky: "Kyrgyz",
    uz: "Uzbek",
    tj: "Tajik",
    mn: "Mongolian",
    ne: "Nepali",
    si: "Sinhala",
    my: "Burmese",
    km: "Khmer",
    lo: "Lao",
  };

  // Convert to lowercase for case-insensitive lookup
  const code = languageCode?.toLowerCase();
  return languageMap[code] || languageCode || "Unknown";
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function formatTorrentType(type: string): string {
  if (!type) return "Unknown";

  const lowerType = type.toLowerCase();
  if (lowerType === "bluray" || lowerType === "blu-ray") {
    return "BluRay";
  }
  if (lowerType === "web" || lowerType === "webrip" || lowerType === "web-dl") {
    return "WEB";
  }
  // For any other types, capitalize first letter
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

export function getQualityColor(quality: string): Color {
  if (quality.includes("2160p") || quality.includes("4K")) {
    return Color.Yellow;
  }
  if (quality.includes("3D")) {
    return Color.Red;
  }
  if (quality.includes("1080p")) {
    return Color.Green;
  }
  if (quality.includes("720p")) {
    return Color.Magenta;
  }
  if (quality.includes("480p")) {
    return Color.Blue;
  }
  return Color.Blue; // Default fallback
}

export function getHighestQuality(torrents: Torrent[]): { quality: string; icon: string; color: Color } {
  if (!torrents || torrents.length === 0) {
    return { quality: "SD", icon: "sd.svg", color: Color.Blue };
  }

  const has4K = torrents.some((t) => t.quality.includes("2160p") || t.quality.includes("4K"));
  const has3D = torrents.some((t) => t.quality.includes("3D"));
  const has1080p = torrents.some((t) => t.quality.includes("1080p"));
  const has720p = torrents.some((t) => t.quality.includes("720p"));
  const has480p = torrents.some((t) => t.quality.includes("480p"));

  if (has4K) return { quality: "4K", icon: "4k.svg", color: Color.Yellow };
  if (has3D) return { quality: "3D", icon: "3d.svg", color: Color.Red };
  if (has1080p) return { quality: "FHD", icon: "full_hd.svg", color: Color.Green };
  if (has720p) return { quality: "HD", icon: "hd.svg", color: Color.Magenta };
  if (has480p) return { quality: "SD", icon: "sd.svg", color: Color.Blue };
  return { quality: "SD", icon: "sd.svg", color: Color.Blue };
}

export function formatQualityWithHDR(torrent: Torrent): string {
  const hdrSuffix = torrent.bit_depth === "10" ? " 10bit" : "";
  return `${torrent.quality} ${formatTorrentType(torrent.type)}${hdrSuffix}`;
}

export function filterAndSortTorrents(torrents: Torrent[]): Torrent[] {
  return (
    torrents
      ?.filter((torrent) => !torrent.quality.includes("3D"))
      ?.sort((a, b) => {
        const aIndex = QUALITY_ORDER.findIndex((q) => a.quality.includes(q));
        const bIndex = QUALITY_ORDER.findIndex((q) => b.quality.includes(q));

        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;

        return aIndex - bIndex;
      }) || []
  );
}
