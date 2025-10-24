import { Icon } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import * as SimpleIcons from "simple-icons";

/**
 * Helper function to get Simple Icon data
 */
function getSimpleIcon(name: string): { svg: string; hex: string; title?: string; slug?: string } | null {
  try {
    // Convert name to Simple Icons property format (e.g., "python" -> "siPython")
    const propertyName = `si${name.charAt(0).toUpperCase()}${name.slice(1)}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const icon = (SimpleIcons as any)[propertyName];

    if (icon && icon.svg && icon.hex) {
      return {
        svg: icon.svg,
        hex: icon.hex,
        title: icon.title,
        slug: icon.slug,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Normalizes section names for better matching
 */
function normalizeSectionName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Normalize common symbols/variants BEFORE stripping punctuation
  normalized = normalized
    .replace(/&/g, "and")
    .replace(/\bc\+\+\b/g, "cplusplus")
    .replace(/\bc#\b/g, "csharp")
    .replace(/\bf#\b/g, "fsharp")
    .replace(/\bk8s\b/g, "kubernetes")
    .replace(/\bgh(?:\s*actions)?\b/g, "githubactions")
    .replace(/\bvs\s*code\b/g, "visualstudiocode")
    .replace(/\bpostgres(?:ql)?\b/g, "postgresql")
    .replace(/\bpsql\b/g, "postgresql")
    .replace(/\bamazon\s*web\s*services\b/g, "amazonaws")
    .replace(/\baws\b/g, "amazonaws")
    .replace(/\bgcp\b/g, "googlecloud")
    .replace(/\bmac\s*os\b|\bosx\b/g, "macos")
    .replace(/\bnode\.?js\b/g, "nodedotjs")
    .replace(/\breact\.?js\b/g, "react")
    .replace(/\bvue\.?js\b/g, "vuedotjs")
    .replace(/\bangular\.?js\b/g, "angular")
    // Additional common patterns
    .replace(/\bpyenv\b/g, "python")
    .replace(/\bsdkman\b/g, "openjdk")
    .replace(/\bjava\b/g, "openjdk")
    .replace(/\bpip\b/g, "python")
    .replace(/\byarn\b/g, "nodedotjs")
    .replace(/\bpnpm\b/g, "nodedotjs")
    .replace(/\bdocker\b/g, "docker")
    .replace(/\bkubernetes\b/g, "kubernetes")
    .replace(/\bmysql\b/g, "mysql")
    .replace(/\bmongodb\b/g, "mongodb")
    .replace(/\bredis\b/g, "redis")
    .replace(/\bgithub\b/g, "github")
    .replace(/\bgitlab\b/g, "gitlab")
    .replace(/\bbitbucket\b/g, "bitbucket");

  normalized = normalized
    // Remove punctuation and special characters (keep alphanumerics only)
    .replace(/[!@#$%^&*()_+=[\]{}|;':",./<>?~`-]/g, "")
    // Remove whitespace
    .replace(/\s+/g, "");

  // Remove generic labels if the whole value is one of them
  if (/^(section|config|setup|init|start|end)$/.test(normalized)) {
    return "";
  }

  return normalized;
}

/**
 * Finds the best matching Simple Icon for a section name
 */
function findBestSimpleIcon(sectionName: string): { name: string; icon: { svg: string; hex?: string } } | null {
  const normalized = normalizeSectionName(sectionName);

  // Skip semantic categories - they should use Raycast icons
  const semanticCategories = [
    "config",
    "settings",
    "aliases",
    "alias",
    "exports",
    "export",
    "functions",
    "function",
    "plugins",
    "plugin",
    "themes",
    "theme",
    "completion",
    "prompt",
    "history",
    "keybindings",
    "shortcuts",
    "system",
    "utilities",
    "tools",
    "environment",
    "path",
    "archived",
    "omz",
    "ohmyzsh",
    "zsh",
    "bash",
    "fish",
    "powershell",
    "tmux",
    "screen",
    "unlabeled",
  ];

  if (semanticCategories.includes(normalized)) {
    return null;
  }

  // Dynamic fuzzy matching - no hardcoded mappings needed

  // Direct match first
  const directMatch = getSimpleIcon(normalized);
  if (directMatch) {
    return { name: normalized, icon: directMatch };
  }

  // Build a lightweight cached index of all icons
  type IndexedIcon = {
    key: string;
    name: string;
    slug: string;
    slugNormalized: string;
    titleNorm: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
  };
  const allIcons: IndexedIcon[] = Object.keys(SimpleIcons)
    .filter((key) => key.startsWith("si"))
    .map((key) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const icon = (SimpleIcons as any)[key];
      const name = key.substring(2).toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const slug: string = (icon as any)?.slug || name;
      const slugNormalized = slug.replace(/-/g, "");
      const titleNorm = (icon?.title || name).toLowerCase().replace(/[^a-z0-9]/g, "");
      return {
        key,
        name,
        slug,
        slugNormalized,
        titleNorm,
        icon,
      } as IndexedIcon;
    })
    .filter((item) => item.icon && item.icon.svg && item.icon.hex);

  // Enhanced fuzzy matching strategies
  // 1) Exact slug/name/title matches
  const exactMatch = allIcons.find(
    (it) =>
      it.slug === normalized ||
      it.slugNormalized === normalized ||
      it.name === normalized ||
      it.titleNorm === normalized,
  );
  if (exactMatch) return exactMatch;

  // 2) Starts with (only for sufficiently long tokens)
  if (normalized.length >= 3) {
    const startsWith = allIcons.filter(
      (it) =>
        it.slugNormalized.startsWith(normalized) ||
        it.name.startsWith(normalized) ||
        it.titleNorm.startsWith(normalized),
    );
    if (startsWith.length > 0) {
      const sorted = startsWith.sort((a, b) => b.slugNormalized.length - a.slugNormalized.length);
      return sorted[0] || null;
    }
  }

  // 3) Contains with similar length (more lenient)
  if (normalized.length >= 3) {
    const contains = allIcons.filter((it) => {
      const candidates = [it.slugNormalized, it.name, it.titleNorm];
      return candidates.some((cand) => {
        if (cand.length < 3) return false;
        const lengthRatio = Math.min(normalized.length, cand.length) / Math.max(normalized.length, cand.length);
        return lengthRatio > 0.6 && (cand.includes(normalized) || normalized.includes(cand));
      });
    });
    if (contains.length > 0) {
      const sorted = contains.sort((a, b) => b.slugNormalized.length - a.slugNormalized.length);
      return sorted[0] || null;
    }
  }

  // 4) Levenshtein distance (more lenient)
  if (normalized.length >= 4) {
    const distMatches = allIcons.filter((it) => {
      const distance = levenshteinDistance(normalized, it.slugNormalized);
      const maxLength = Math.max(normalized.length, it.slugNormalized.length);
      return distance <= Math.floor(maxLength * 0.25); // More lenient threshold
    });
    if (distMatches.length > 0) {
      const sorted = distMatches.sort((a, b) => b.slugNormalized.length - a.slugNormalized.length);
      return sorted[0] || null;
    }
  }

  // 5) Word-based matching for compound names
  if (normalized.length >= 4) {
    // Split on hyphens, underscores, and camelCase boundaries
    const words = normalized.split(/[-_]|(?=[A-Z])/).filter((w) => w.length >= 2);
    if (words.length > 1) {
      // Try to find icons that match any of the words
      const wordMatches = allIcons.filter((it) => {
        const candidates = [it.slugNormalized, it.name, it.titleNorm];
        return candidates.some((cand) => {
          return words.some((word) => {
            // Check if word is contained in candidate or vice versa
            return cand.includes(word) || word.includes(cand);
          });
        });
      });

      if (wordMatches.length > 0) {
        // Score matches by word length and position
        const scoredMatches = wordMatches.map((it) => {
          let score = 0;
          const candidates = [it.slugNormalized, it.name, it.titleNorm];

          words.forEach((word) => {
            candidates.forEach((cand) => {
              if (cand.includes(word)) {
                score += word.length; // Longer matches get higher scores
              }
              if (word.includes(cand)) {
                score += cand.length;
              }
            });
          });

          return { ...it, score };
        });

        // Return the highest scoring match
        const sorted = scoredMatches.sort((a, b) => b.score - a.score);
        return sorted[0] || null;
      }
    }
  }

  // 6) Substring matching for compound names (fallback)
  if (normalized.length >= 4) {
    // Try to find icons where the normalized name contains the icon name
    const substringMatches = allIcons.filter((it) => {
      const candidates = [it.slugNormalized, it.name, it.titleNorm];
      return candidates.some((cand) => {
        return normalized.includes(cand) || cand.includes(normalized);
      });
    });

    if (substringMatches.length > 0) {
      // Score by length of match
      const scoredMatches = substringMatches.map((it) => {
        let score = 0;
        const candidates = [it.slugNormalized, it.name, it.titleNorm];

        candidates.forEach((cand) => {
          if (normalized.includes(cand)) {
            score += cand.length;
          }
          if (cand.includes(normalized)) {
            score += normalized.length;
          }
        });

        return { ...it, score };
      });

      const sorted = scoredMatches.sort((a, b) => b.score - a.score);
      return sorted[0] || null;
    }
  }

  return null;
}

/**
 * Simple Levenshtein distance implementation
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str1.length; i++) {
    const row = matrix[0];
    if (row) row[i] = i;
  }
  for (let j = 0; j <= str2.length; j++) {
    const row = matrix[j];
    if (row) row[0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      const row = matrix[j];
      const prevRow = matrix[j - 1];
      if (row && prevRow) {
        const deletion = row[i - 1] ?? 0;
        const insertion = prevRow[i] ?? 0;
        const substitution = prevRow[i - 1] ?? 0;
        row[i] = Math.min(
          deletion + 1, // deletion
          insertion + 1, // insertion
          substitution + indicator, // substitution
        );
      }
    }
  }

  const lastRow = matrix[str2.length];
  return lastRow?.[str1.length] || 0;
}

/**
 * Determines semantic category for fallback icons
 */
function getSemanticCategory(sectionName: string): {
  icon: Icon;
  color: string;
} {
  const normalized = normalizeSectionName(sectionName);

  // Define all technology categories first
  const languages = [
    "python",
    "java",
    "javascript",
    "typescript",
    "go",
    "rust",
    "php",
    "ruby",
    "swift",
    "kotlin",
    "scala",
    "clojure",
    "haskell",
    "elixir",
    "dart",
    "csharp",
    "cpp",
    "c",
  ];

  const frameworks = [
    "react",
    "vue",
    "angular",
    "svelte",
    "nextjs",
    "nuxt",
    "express",
    "django",
    "flask",
    "rails",
    "spring",
    "laravel",
    "symfony",
  ];

  const databases = ["mysql", "postgresql", "mongodb", "redis", "sqlite", "mariadb", "elasticsearch", "cassandra"];

  const devops = [
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "terraform",
    "ansible",
    "jenkins",
    "gitlab",
    "github",
    "bitbucket",
  ];

  const packageManagers = ["npm", "yarn", "pnpm", "pip", "composer", "cargo", "maven", "gradle", "brew", "apt", "yum"];

  // Zsh-specific frameworks and tools
  const zshFrameworks = [
    "ohmyzsh",
    "oh-my-zsh",
    "omz",
    "zinit",
    "antigen",
    "prezto",
    "zim",
    "zplug",
    "zgen",
    "zgenom",
    "zcomet",
    "zsh",
    "bash",
    "fish",
    "powershell",
  ];

  // Development tools and environments
  const devTools = [
    "node",
    "nodejs",
    "npm",
    "yarn",
    "pnpm",
    "python",
    "pip",
    "conda",
    "virtualenv",
    "venv",
    "poetry",
    "go",
    "golang",
    "rust",
    "cargo",
    "java",
    "maven",
    "gradle",
    "sbt",
    "php",
    "composer",
    "ruby",
    "gem",
    "bundler",
    "rails",
    "django",
    "flask",
    "react",
    "vue",
    "angular",
    "svelte",
    "next",
    "nuxt",
    "webpack",
    "vite",
    "rollup",
    "babel",
    "eslint",
    "prettier",
    "typescript",
    "tsc",
    "deno",
    "bun",
  ];

  // System and OS specific
  const systemTools = [
    "macos",
    "osx",
    "linux",
    "ubuntu",
    "debian",
    "fedora",
    "arch",
    "windows",
    "wsl",
    "homebrew",
    "brew",
    "apt",
    "yum",
    "dnf",
    "pacman",
    "portage",
    "nix",
    "guix",
  ];

  // Terminal and shell tools
  const terminalTools = [
    "tmux",
    "screen",
    "alacritty",
    "iterm",
    "iterm2",
    "terminator",
    "gnome-terminal",
    "konsole",
    "hyper",
    "kitty",
    "wezterm",
    "tabby",
    "warp",
    "starship",
    "oh-my-posh",
    "powerlevel10k",
    "spaceship",
    "pure",
    "agnoster",
    "robbyrussell",
    "bira",
    "lambda",
    "ys",
    "fino",
    "steeef",
    "junkfood",
    "minimal",
    "apple",
    "af-magic",
    "amuse",
    "arrow",
    "aussiegeek",
    "avit",
    "awesomepanda",
    "bira",
    "blinks",
    "bureau",
    "candy",
    "clean",
    "cloud",
    "crunch",
    "cypher",
    "dallas",
    "darkblood",
    "daveverwer",
    "dieter",
    "dogenpunk",
    "dpoggi",
    "dst",
    "dstufft",
    "duellj",
    "eastwood",
    "edvardm",
    "emotty",
    "essembeh",
    "evan",
    "example",
    "fino",
    "fishy",
    "flazz",
    "fox",
    "frisk",
    "frontcube",
    "funky",
    "fwalch",
    "gallifrey",
    "gallois",
    "garyblessington",
    "gentoo",
    "geoffgarside",
    "gianu",
    "gnzh",
    "gozilla",
    "half-life",
    "humza",
    "imajes",
    "intheloop",
    "itchy",
    "jaischeema",
    "jbergantine",
    "jispavan",
    "jnrowe",
    "jonathan",
    "josh",
    "jreese",
    "jtriley",
    "juanghurtado",
    "junkfood",
    "kafeitu",
    "kardan",
    "kennethreitz",
    "kiwi",
    "kolo",
    "kphoen",
    "kristoff",
    "lambda",
    "linuxonly",
    "lukerandall",
    "macovsky",
    "maran",
    "masha",
    "mh",
    "michelebologna",
    "mikeh",
    "miloshadzic",
    "minimal",
    "mira",
    "mlh",
    "mortalscumbag",
    "mrtazz",
    "murilasso",
    "muse",
    "nanotech",
    "nebirhos",
    "nicoulaj",
    "norm",
    "obraun",
    "peepcode",
    "philips",
    "pmcgee",
    "pure",
    "pygmalion",
    "pygmalion-virtualenv",
    "random",
    "re5et",
    "refined",
    "rgm",
    "risto",
    "rixius",
    "rkj",
    "rkj-repos",
    "robbyrussell",
    "sammy",
    "simonoff",
    "simple",
    "skaro",
    "smt",
    "sonicradish",
    "sorin",
    "sporty_256",
    "steeef",
    "strug",
    "sunaku",
    "sunrise",
    "superjarin",
    "suvash",
    "takashiyoshida",
    "terminalparty",
    "theunraveler",
    "tjkirch",
    "tjkirch_mod",
    "tonotdo",
    "trapd00r",
    "wedisagree",
    "wezm",
    "wezm+",
    "wuffers",
    "xiong-chiamiov",
    "xiong-chiamiov-plus",
    "ys",
    "zhann",
  ];

  // Check if any technology keyword is present
  const hasTechnologyKeyword =
    languages.some((lang) => normalized.includes(lang)) ||
    frameworks.some((fw) => normalized.includes(fw)) ||
    databases.some((db) => normalized.includes(db)) ||
    devops.some((tool) => normalized.includes(tool)) ||
    packageManagers.some((pm) => normalized.includes(pm)) ||
    zshFrameworks.some((zsh) => normalized.includes(zsh)) ||
    devTools.some((tool) => normalized.includes(tool)) ||
    systemTools.some((sys) => normalized.includes(sys)) ||
    terminalTools.some((term) => normalized.includes(term));

  // Apply specific icon mappings for technology categories
  // Zsh frameworks and shells
  if (zshFrameworks.some((zsh) => normalized.includes(zsh))) {
    return { icon: Icon.Terminal, color: MODERN_COLORS.success };
  }

  // Terminal and shell tools
  if (terminalTools.some((term) => normalized.includes(term))) {
    return { icon: Icon.Terminal, color: MODERN_COLORS.warning };
  }

  // Development tools
  if (devTools.some((tool) => normalized.includes(tool))) {
    return { icon: Icon.Code, color: MODERN_COLORS.primary };
  }

  // System and OS tools
  if (systemTools.some((sys) => normalized.includes(sys))) {
    return { icon: Icon.Gear, color: MODERN_COLORS.neutral };
  }

  // Only apply semantic categorization if no technology keyword is detected
  // This allows fuzzy matching to work first for compound names
  if (!hasTechnologyKeyword) {
    // Programming languages
    if (languages.some((lang) => normalized.includes(lang))) {
      return { icon: Icon.Code, color: MODERN_COLORS.primary };
    }

    // Frameworks
    if (frameworks.some((fw) => normalized.includes(fw))) {
      return { icon: Icon.Code, color: MODERN_COLORS.success };
    }

    // Databases
    if (databases.some((db) => normalized.includes(db))) {
      return { icon: Icon.Box, color: MODERN_COLORS.warning };
    }

    // DevOps & Cloud
    if (devops.some((tool) => normalized.includes(tool))) {
      return { icon: Icon.Box, color: MODERN_COLORS.error };
    }

    // Package managers
    if (packageManagers.some((pm) => normalized.includes(pm))) {
      return { icon: Icon.Box, color: MODERN_COLORS.neutral };
    }
  }

  // Shell & Terminal
  const shells = ["zsh", "bash", "fish", "powershell", "tmux", "screen"];
  if (shells.some((shell) => normalized.includes(shell))) {
    return { icon: Icon.Terminal, color: MODERN_COLORS.success };
  }

  // Common zshrc section patterns
  const commonSectionPatterns = [
    // Oh My Zsh specific
    {
      pattern: /^(ohmyzsh|oh-my-zsh|omz)$/,
      icon: Icon.Terminal,
      color: MODERN_COLORS.success,
    },
    {
      pattern: /^(zinit|antigen|prezto|zim|zplug|zgen|zgenom|zcomet)$/,
      icon: Icon.Terminal,
      color: MODERN_COLORS.warning,
    },

    // Theme related
    {
      pattern: /^(theme|themes|prompt|prompts)$/,
      icon: Icon.Eye,
      color: MODERN_COLORS.warning,
    },
    {
      pattern: /^(powerlevel10k|p10k|starship|spaceship|pure|agnoster|robbyrussell)$/,
      icon: Icon.Eye,
      color: MODERN_COLORS.success,
    },

    // Plugin related
    {
      pattern: /^(plugin|plugins|extension|extensions)$/,
      icon: Icon.Box,
      color: MODERN_COLORS.warning,
    },
    {
      pattern: /^(autosuggestions|syntax-highlighting|completion|completions)$/,
      icon: Icon.Terminal,
      color: MODERN_COLORS.success,
    },

    // Environment and configuration
    {
      pattern: /^(env|environment|envvars|variables)$/,
      icon: Icon.Box,
      color: MODERN_COLORS.primary,
    },
    {
      pattern: /^(config|configuration|settings|setup|init)$/,
      icon: Icon.Gear,
      color: MODERN_COLORS.neutral,
    },
    {
      pattern: /^(path|paths|bin|binaries)$/,
      icon: Icon.Folder,
      color: MODERN_COLORS.primary,
    },

    // Development tools
    {
      pattern: /^(node|nodejs|npm|yarn|pnpm)$/,
      icon: Icon.Code,
      color: MODERN_COLORS.success,
    },
    {
      pattern: /^(python|pip|conda|poetry)$/,
      icon: Icon.Code,
      color: MODERN_COLORS.warning,
    },
    {
      pattern: /^(git|github|gitlab|bitbucket)$/,
      icon: Icon.Box,
      color: MODERN_COLORS.neutral,
    },
    {
      pattern: /^(docker|kubernetes|k8s)$/,
      icon: Icon.Box,
      color: MODERN_COLORS.primary,
    },

    // System and OS
    {
      pattern: /^(macos|osx|apple)$/,
      icon: Icon.Gear,
      color: MODERN_COLORS.neutral,
    },
    {
      pattern: /^(linux|ubuntu|debian|fedora|arch)$/,
      icon: Icon.Gear,
      color: MODERN_COLORS.warning,
    },
    {
      pattern: /^(homebrew|brew)$/,
      icon: Icon.Box,
      color: MODERN_COLORS.success,
    },

    // Terminal and shell tools
    {
      pattern: /^(tmux|screen)$/,
      icon: Icon.Terminal,
      color: MODERN_COLORS.neutral,
    },
    {
      pattern: /^(iterm|iterm2|alacritty|kitty|hyper)$/,
      icon: Icon.Terminal,
      color: MODERN_COLORS.primary,
    },

    // Aliases and functions
    {
      pattern: /^(alias|aliases|shortcuts)$/,
      icon: Icon.Terminal,
      color: MODERN_COLORS.success,
    },
    {
      pattern: /^(function|functions|fn)$/,
      icon: Icon.Code,
      color: MODERN_COLORS.primary,
    },
    {
      pattern: /^(export|exports|env)$/,
      icon: Icon.Box,
      color: MODERN_COLORS.primary,
    },

    // History and keybindings
    {
      pattern: /^(history|hist)$/,
      icon: Icon.Clock,
      color: MODERN_COLORS.neutral,
    },
    {
      pattern: /^(keybinding|keybindings|bindkey|shortcuts)$/,
      icon: Icon.Keyboard,
      color: MODERN_COLORS.warning,
    },

    // File operations
    {
      pattern: /^(source|sources|include|includes)$/,
      icon: Icon.Document,
      color: MODERN_COLORS.primary,
    },
    {
      pattern: /^(autoload|autoloads|load)$/,
      icon: Icon.Box,
      color: MODERN_COLORS.success,
    },
    {
      pattern: /^(fpath|fpaths)$/,
      icon: Icon.Folder,
      color: MODERN_COLORS.warning,
    },

    // Evaluation and options
    {
      pattern: /^(eval|evals|execute)$/,
      icon: Icon.Terminal,
      color: MODERN_COLORS.error,
    },
    {
      pattern: /^(setopt|setopts|options|opts)$/,
      icon: Icon.Gear,
      color: MODERN_COLORS.neutral,
    },

    // Miscellaneous
    {
      pattern: /^(custom|customs|personal)$/,
      icon: Icon.Folder,
      color: MODERN_COLORS.neutral,
    },
    {
      pattern: /^(utility|utilities|tools|misc)$/,
      icon: Icon.Gear,
      color: MODERN_COLORS.neutral,
    },
    {
      pattern: /^(archive|archived|old|deprecated)$/,
      icon: Icon.Folder,
      color: MODERN_COLORS.neutral,
    },
  ];

  // Check common section patterns first
  for (const { pattern, icon, color } of commonSectionPatterns) {
    if (pattern.test(normalized)) {
      return { icon, color };
    }
  }

  // Common suffixes (only apply if no technology was detected)
  if (!hasTechnologyKeyword) {
    if (normalized.endsWith("config") || normalized.endsWith("settings")) {
      return { icon: Icon.Gear, color: MODERN_COLORS.neutral };
    }

    if (normalized.endsWith("aliases") || normalized.endsWith("alias")) {
      return { icon: Icon.Terminal, color: MODERN_COLORS.success };
    }

    if (normalized.endsWith("exports") || normalized.endsWith("export")) {
      return { icon: Icon.Box, color: MODERN_COLORS.primary };
    }

    if (normalized.endsWith("functions") || normalized.endsWith("function")) {
      return { icon: Icon.Code, color: MODERN_COLORS.primary };
    }

    if (normalized.endsWith("plugins") || normalized.endsWith("plugin")) {
      return { icon: Icon.Box, color: MODERN_COLORS.warning };
    }

    if (normalized.endsWith("themes") || normalized.endsWith("theme")) {
      return { icon: Icon.Eye, color: MODERN_COLORS.warning };
    }

    if (normalized.endsWith("evals") || normalized.endsWith("eval")) {
      return { icon: Icon.Terminal, color: MODERN_COLORS.error };
    }

    if (normalized.endsWith("setopts") || normalized.endsWith("setopt")) {
      return { icon: Icon.Gear, color: MODERN_COLORS.neutral };
    }

    if (normalized.endsWith("sources") || normalized.endsWith("source")) {
      return { icon: Icon.Document, color: MODERN_COLORS.primary };
    }

    if (normalized.endsWith("autoloads") || normalized.endsWith("autoload")) {
      return { icon: Icon.Box, color: MODERN_COLORS.success };
    }

    if (normalized.endsWith("fpaths") || normalized.endsWith("fpath")) {
      return { icon: Icon.Folder, color: MODERN_COLORS.warning };
    }

    if (normalized.endsWith("paths") || normalized.endsWith("path")) {
      return { icon: Icon.Folder, color: MODERN_COLORS.primary };
    }

    if (normalized.endsWith("completions") || normalized.endsWith("completion")) {
      return { icon: Icon.Terminal, color: MODERN_COLORS.success };
    }

    if (normalized.endsWith("history")) {
      return { icon: Icon.Clock, color: MODERN_COLORS.neutral };
    }

    if (normalized.endsWith("keybindings") || normalized.endsWith("keybinding")) {
      return { icon: Icon.Keyboard, color: MODERN_COLORS.warning };
    }
  }

  // Default fallback
  return { icon: Icon.Folder, color: MODERN_COLORS.neutral };
}

/**
 * Converts SVG string to data URL for Raycast compatibility
 */
function svgToDataUrl(svg: string): string {
  // Clean up the SVG string
  const cleanSvg = svg.trim();

  // Use base64 encoding for better compatibility with special characters
  try {
    // Prefer browser btoa if available, otherwise use Node Buffer
    const base64 =
      typeof btoa !== "undefined"
        ? btoa(unescape(encodeURIComponent(cleanSvg)))
        : Buffer.from(cleanSvg, "utf8").toString("base64");
    return `data:image/svg+xml;base64,${base64}`;
  } catch {
    // Fallback to URL encoding if base64 fails
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanSvg)}`;
  }
}

/**
 * Icon source type that can be either a data URL string or Raycast Icon
 */
type IconSource = string | Icon;

/**
 * Dynamic icon lookup system based on section names
 * Uses Simple Icons with fuzzy matching and semantic fallbacks
 */

/**
 * Gets the appropriate icon and color for a section name using dynamic lookup
 * @param sectionName The name of the section
 * @returns Object with icon and color properties
 */
export function getSectionIcon(sectionName: string): {
  icon: IconSource;
  color: string;
} {
  // Step 1: Try to find a matching Simple Icon
  const simpleIconMatch = findBestSimpleIcon(sectionName);
  if (simpleIconMatch) {
    return {
      icon: svgToDataUrl(simpleIconMatch.icon.svg),
      color: String(simpleIconMatch.icon.hex || "").toUpperCase(),
    };
  }

  // Step 2: Fall back to semantic categorization
  return getSemanticCategory(sectionName);
}

/**
 * Gets a list of all available Simple Icons for reference
 * @returns Array of available Simple Icon names
 */
export function getAvailableSectionIcons(): string[] {
  return Object.keys(SimpleIcons)
    .filter((key) => key.startsWith("si"))
    .map((key) => key.substring(2).toLowerCase()) // Remove 'si' prefix
    .sort();
}
