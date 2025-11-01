import { describe, it, expect } from "vitest";
import { countAllPatterns } from "../lib/pattern-registry";

describe("pattern-registry.ts", () => {
  describe("countAliases", () => {
    it("should count single alias", () => {
      const content = `alias ll='ls -la'`;
      const result = countAllPatterns(content);
      expect(result.aliases).toBe(1);
    });

    it("should count multiple aliases", () => {
      const content = `alias ll='ls -la'\nalias gs='git status'\nalias dev='npm run dev'`;
      const result = countAllPatterns(content);
      expect(result.aliases).toBe(3);
    });

    it("should count aliases with different quote styles", () => {
      const content = `alias ll='ls -la'\nalias gs="git status"`;
      const result = countAllPatterns(content);
      expect(result.aliases).toBe(2);
    });

    it("should return 0 when no aliases", () => {
      const content = `export PATH=/usr/local/bin`;
      const result = countAllPatterns(content);
      expect(result.aliases).toBe(0);
    });

    it("should handle aliases with special characters", () => {
      const content = `alias ll='ls -la'\nalias gs='git status'\nalias ll-alias='ls -lah'`;
      const result = countAllPatterns(content);
      expect(result.aliases).toBeGreaterThan(0);
    });
  });

  describe("countExports", () => {
    it("should count single export", () => {
      const content = `export PATH=/usr/local/bin:$PATH`;
      const result = countAllPatterns(content);
      expect(result.exports).toBe(1);
    });

    it("should count multiple exports", () => {
      const content = `export PATH=/usr/local/bin:$PATH\nexport NODE_ENV=production\nexport EDITOR=vim`;
      const result = countAllPatterns(content);
      expect(result.exports).toBe(3);
    });

    it("should count typeset -x exports", () => {
      const content = `typeset -x PATH=/usr/local/bin:$PATH`;
      const result = countAllPatterns(content);
      expect(result.exports).toBe(1);
    });

    it("should count both export and typeset", () => {
      const content = `export PATH=/usr/local/bin\ntypeset -x NODE_ENV=production`;
      const result = countAllPatterns(content);
      expect(result.exports).toBe(2);
    });

    it("should return 0 when no exports", () => {
      const content = `alias ll='ls -la'`;
      const result = countAllPatterns(content);
      expect(result.exports).toBe(0);
    });
  });

  describe("countEvals", () => {
    it("should count single eval", () => {
      const content = `eval "$(rbenv init -)"`;
      const result = countAllPatterns(content);
      expect(result.evals).toBe(1);
    });

    it("should count multiple evals", () => {
      const content = `eval "$(rbenv init -)"\neval "$(nodenv init -)"\neval "$(pyenv init -)"`;
      const result = countAllPatterns(content);
      expect(result.evals).toBe(3);
    });

    it("should return 0 when no evals", () => {
      const content = `alias ll='ls -la'`;
      const result = countAllPatterns(content);
      expect(result.evals).toBe(0);
    });
  });

  describe("countSetopts", () => {
    it("should count single setopt", () => {
      const content = `setopt HIST_IGNORE_DUPS`;
      const result = countAllPatterns(content);
      expect(result.setopts).toBe(1);
    });

    it("should count multiple setopts", () => {
      const content = `setopt HIST_IGNORE_DUPS\nsetopt SHARE_HISTORY\nsetopt AUTO_CD`;
      const result = countAllPatterns(content);
      expect(result.setopts).toBe(3);
    });

    it("should return 0 when no setopts", () => {
      const content = `alias ll='ls -la'`;
      const result = countAllPatterns(content);
      expect(result.setopts).toBe(0);
    });
  });

  describe("countPlugins", () => {
    it("should count single plugin declaration", () => {
      const content = `plugins=(git)`;
      const result = countAllPatterns(content);
      expect(result.plugins).toBe(1);
    });

    it("should count multiple plugin declarations", () => {
      const content = `plugins=(git)\nplugins=(docker)`;
      const result = countAllPatterns(content);
      expect(result.plugins).toBe(2);
    });

    it("should return 0 when no plugins", () => {
      const content = `alias ll='ls -la'`;
      const result = countAllPatterns(content);
      expect(result.plugins).toBe(0);
    });
  });

  describe("countFunctions", () => {
    it("should count single function", () => {
      const content = `my_function() {`;
      const result = countAllPatterns(content);
      expect(result.functions).toBe(1);
    });

    it("should count multiple functions", () => {
      const content = `my_function() {\nanother_function() {\nthird_function() {`;
      const result = countAllPatterns(content);
      expect(result.functions).toBe(3);
    });

    it("should handle functions with underscores", () => {
      const content = `my_function_name() {`;
      const result = countAllPatterns(content);
      expect(result.functions).toBe(1);
    });

    it("should return 0 when no functions", () => {
      const content = `alias ll='ls -la'`;
      const result = countAllPatterns(content);
      expect(result.functions).toBe(0);
    });
  });

  describe("countSources", () => {
    it("should count single source", () => {
      const content = `source ~/.zshrc.local`;
      const result = countAllPatterns(content);
      expect(result.sources).toBe(1);
    });

    it("should count multiple sources", () => {
      const content = `source ~/.zshrc.local\nsource ~/.config/zsh/aliases.zsh\nsource /usr/local/share/zsh/site-functions/zsh-syntax-highlighting.zsh`;
      const result = countAllPatterns(content);
      expect(result.sources).toBe(3);
    });

    it("should return 0 when no sources", () => {
      const content = `alias ll='ls -la'`;
      const result = countAllPatterns(content);
      expect(result.sources).toBe(0);
    });
  });

  describe("countAutoloads", () => {
    it("should count single autoload", () => {
      const content = `autoload -Uz compinit`;
      const result = countAllPatterns(content);
      expect(result.autoloads).toBe(1);
    });

    it("should count autoload without flags", () => {
      const content = `autoload compinit`;
      const result = countAllPatterns(content);
      expect(result.autoloads).toBe(1);
    });

    it("should count multiple autoloads", () => {
      const content = `autoload -Uz compinit\nautoload -Uz bashcompinit\nautoload colors`;
      const result = countAllPatterns(content);
      expect(result.autoloads).toBe(3);
    });

    it("should return 0 when no autoloads", () => {
      const content = `alias ll='ls -la'`;
      const result = countAllPatterns(content);
      expect(result.autoloads).toBe(0);
    });
  });

  describe("countFpaths", () => {
    it("should count single fpath", () => {
      const content = `fpath=(~/.zsh/functions)`;
      const result = countAllPatterns(content);
      expect(result.fpaths).toBe(1);
    });

    it("should count multiple fpaths", () => {
      const content = `fpath=(~/.zsh/functions)\nfpath=(/usr/local/share/zsh/site-functions)`;
      const result = countAllPatterns(content);
      expect(result.fpaths).toBe(2);
    });

    it("should return 0 when no fpaths", () => {
      const content = `alias ll='ls -la'`;
      const result = countAllPatterns(content);
      expect(result.fpaths).toBe(0);
    });
  });

  describe("countPaths", () => {
    it("should count single PATH", () => {
      const content = `PATH=/usr/local/bin:$PATH`;
      const result = countAllPatterns(content);
      expect(result.paths).toBe(1);
    });

    it("should count multiple PATH declarations", () => {
      const content = `PATH=/usr/local/bin:$PATH\nPATH=$HOME/.local/bin:$PATH`;
      const result = countAllPatterns(content);
      expect(result.paths).toBe(2);
    });

    it("should return 0 when no PATH", () => {
      const content = `alias ll='ls -la'`;
      const result = countAllPatterns(content);
      expect(result.paths).toBe(0);
    });
  });

  describe("countThemes", () => {
    it("should count single theme", () => {
      const content = `ZSH_THEME="robbyrussell"`;
      const result = countAllPatterns(content);
      expect(result.themes).toBe(1);
    });

    it("should count themes with single quotes", () => {
      const content = `ZSH_THEME='agnoster'`;
      const result = countAllPatterns(content);
      expect(result.themes).toBe(1);
    });

    it("should count multiple themes", () => {
      const content = `ZSH_THEME="robbyrussell"\nZSH_THEME="powerlevel10k"`;
      const result = countAllPatterns(content);
      expect(result.themes).toBe(2);
    });

    it("should return 0 when no themes", () => {
      const content = `alias ll='ls -la'`;
      const result = countAllPatterns(content);
      expect(result.themes).toBe(0);
    });
  });

  describe("countCompletions", () => {
    it("should count single compinit", () => {
      const content = `compinit`;
      const result = countAllPatterns(content);
      expect(result.completions).toBe(1);
    });

    it("should count compinit with spaces", () => {
      const content = `  compinit`;
      const result = countAllPatterns(content);
      expect(result.completions).toBe(1);
    });

    it("should count multiple compinit calls", () => {
      const content = `compinit\ncompinit -D`;
      const result = countAllPatterns(content);
      expect(result.completions).toBe(2);
    });

    it("should return 0 when no completions", () => {
      const content = `alias ll='ls -la'`;
      const result = countAllPatterns(content);
      expect(result.completions).toBe(0);
    });
  });

  describe("countHistory", () => {
    it("should count single history setting", () => {
      const content = `HISTSIZE=10000`;
      const result = countAllPatterns(content);
      expect(result.history).toBe(1);
    });

    it("should count multiple history settings", () => {
      const content = `HISTSIZE=10000\nHISTFILE=~/.zsh_history\nHISTSAVE=10000`;
      const result = countAllPatterns(content);
      expect(result.history).toBe(3);
    });

    it("should return 0 when no history settings", () => {
      const content = `alias ll='ls -la'`;
      const result = countAllPatterns(content);
      expect(result.history).toBe(0);
    });
  });

  describe("countKeybindings", () => {
    it("should count single bindkey", () => {
      const content = `bindkey '^R' history-incremental-search-backward`;
      const result = countAllPatterns(content);
      expect(result.keybindings).toBe(1);
    });

    it("should count multiple bindkeys", () => {
      const content = `bindkey '^R' history-incremental-search-backward\nbindkey '^[[A' up-line-or-history`;
      const result = countAllPatterns(content);
      expect(result.keybindings).toBe(2);
    });

    it("should return 0 when no keybindings", () => {
      const content = `alias ll='ls -la'`;
      const result = countAllPatterns(content);
      expect(result.keybindings).toBe(0);
    });
  });

  describe("countAllPatterns", () => {
    it("should count all patterns in a complex zshrc file", () => {
      const content = `
# Aliases
alias ll='ls -la'
alias gs='git status'

# Exports
export PATH=/usr/local/bin:$PATH
typeset -x NODE_ENV=production

# Functions
my_function() {
  echo "test"
}

# Source
source ~/.zshrc.local

# Eval
eval "$(rbenv init -)"

# Setopt
setopt HIST_IGNORE_DUPS

# Plugins
plugins=(git docker)

# Autoload
autoload -Uz compinit

# Fpath
fpath=(~/.zsh/functions)

# PATH
PATH=$HOME/.local/bin:$PATH

# Theme
ZSH_THEME="robbyrussell"

# Completion
compinit

# History
HISTSIZE=10000

# Keybinding
bindkey '^R' history-incremental-search-backward
`;

      const result = countAllPatterns(content);

      expect(result.aliases).toBe(2);
      expect(result.exports).toBe(2);
      expect(result.functions).toBe(1);
      expect(result.sources).toBe(1);
      expect(result.evals).toBe(1);
      expect(result.setopts).toBe(1);
      expect(result.plugins).toBe(1);
      expect(result.autoloads).toBe(1);
      expect(result.fpaths).toBe(1);
      expect(result.paths).toBe(1);
      expect(result.themes).toBe(1);
      expect(result.completions).toBe(1);
      expect(result.history).toBe(1);
      expect(result.keybindings).toBe(1);
    });

    it("should return all zeros for empty content", () => {
      const result = countAllPatterns("");

      expect(result.aliases).toBe(0);
      expect(result.exports).toBe(0);
      expect(result.evals).toBe(0);
      expect(result.setopts).toBe(0);
      expect(result.plugins).toBe(0);
      expect(result.functions).toBe(0);
      expect(result.sources).toBe(0);
      expect(result.autoloads).toBe(0);
      expect(result.fpaths).toBe(0);
      expect(result.paths).toBe(0);
      expect(result.themes).toBe(0);
      expect(result.completions).toBe(0);
      expect(result.history).toBe(0);
      expect(result.keybindings).toBe(0);
    });

    it("should handle whitespace-only content", () => {
      const result = countAllPatterns("   \n\n  \t  ");

      expect(result.aliases).toBe(0);
      expect(result.exports).toBe(0);
      expect(result.functions).toBe(0);
    });
  });
});
