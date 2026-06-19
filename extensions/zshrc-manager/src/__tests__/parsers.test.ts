import { parseAliases, parseExports, parsePathEntries, parseFpathEntries, parseKeybindings } from "../utils/parsers";

describe("parsers.ts", () => {
  describe("parseAliases", () => {
    it("should parse single-quoted aliases", () => {
      const content = `alias ll='ls -la'
alias py='python3'`;

      const result = parseAliases(content);

      expect(result).toEqual([
        { name: "ll", command: "ls -la" },
        { name: "py", command: "python3" },
      ]);
    });

    it("should parse double-quoted aliases", () => {
      const content = `alias ll="ls -la"
alias py="python3"`;

      const result = parseAliases(content);

      expect(result).toEqual([
        { name: "ll", command: "ls -la" },
        { name: "py", command: "python3" },
      ]);
    });

    it("should parse aliases with complex commands", () => {
      const content = `alias gst='git status'
alias gco='git checkout'
alias gcm='git commit -m'`;

      const result = parseAliases(content);

      expect(result).toEqual([
        { name: "gst", command: "git status" },
        { name: "gco", command: "git checkout" },
        { name: "gcm", command: "git commit -m" },
      ]);
    });

    it("should parse aliases with special characters in names", () => {
      const content = `alias ll='ls -la'
alias py3='python3'
alias gst='git status'`;

      const result = parseAliases(content);

      expect(result).toEqual([
        { name: "ll", command: "ls -la" },
        { name: "py3", command: "python3" },
        { name: "gst", command: "git status" },
      ]);
    });

    it("should handle aliases with whitespace", () => {
      const content = `  alias ll='ls -la'  
alias py='python3'`;

      const result = parseAliases(content);

      expect(result).toEqual([
        { name: "ll", command: "ls -la" },
        { name: "py", command: "python3" },
      ]);
    });

    it("should return empty array for content with no aliases", () => {
      const content = `export PATH=/usr/local/bin:$PATH
echo "Hello World"`;

      const result = parseAliases(content);

      expect(result).toEqual([]);
    });

    it("should return empty array for empty content", () => {
      const result = parseAliases("");
      expect(result).toEqual([]);
    });

    it("should handle malformed aliases gracefully", () => {
      const content = `alias ll='ls -la'
alias incomplete
alias py='python3'`;

      const result = parseAliases(content);

      expect(result).toEqual([
        { name: "ll", command: "ls -la" },
        { name: "py", command: "python3" },
      ]);
    });

    it("should handle aliases with nested quotes", () => {
      const content = `alias test='echo "Hello World"'
alias complex='git log --oneline --grep="fix"'`;

      const result = parseAliases(content);

      expect(result).toEqual([
        { name: "test", command: 'echo "Hello World"' },
        { name: "complex", command: 'git log --oneline --grep="fix"' },
      ]);
    });
  });

  describe("parseExports", () => {
    it("should parse export statements", () => {
      const content = `export PATH=/usr/local/bin:$PATH
export EDITOR=vim
export NODE_ENV=development`;

      const result = parseExports(content);

      expect(result).toEqual([
        { variable: "PATH", value: "/usr/local/bin:$PATH" },
        { variable: "EDITOR", value: "vim" },
        { variable: "NODE_ENV", value: "development" },
      ]);
    });

    it("should parse typeset -x statements", () => {
      const content = `typeset -x PATH=/usr/local/bin:$PATH
typeset -x EDITOR=vim`;

      const result = parseExports(content);

      expect(result).toEqual([
        { variable: "PATH", value: "/usr/local/bin:$PATH" },
        { variable: "EDITOR", value: "vim" },
      ]);
    });

    it("should parse exports with complex values", () => {
      const content = `export PYTHONPATH="/usr/local/lib/python3.9/site-packages"
export DOCKER_DEFAULT_PLATFORM=linux/amd64`;

      const result = parseExports(content);

      expect(result).toEqual([
        {
          variable: "PYTHONPATH",
          value: '"/usr/local/lib/python3.9/site-packages"',
        },
        { variable: "DOCKER_DEFAULT_PLATFORM", value: "linux/amd64" },
      ]);
    });

    it("should handle exports with whitespace", () => {
      const content = `  export PATH=/usr/local/bin:$PATH  
export EDITOR=vim`;

      const result = parseExports(content);

      expect(result).toEqual([
        { variable: "PATH", value: "/usr/local/bin:$PATH" },
        { variable: "EDITOR", value: "vim" },
      ]);
    });

    it("should return empty array for content with no exports", () => {
      const content = `alias ll='ls -la'
echo "Hello World"`;

      const result = parseExports(content);

      expect(result).toEqual([]);
    });

    it("should return empty array for empty content", () => {
      const result = parseExports("");
      expect(result).toEqual([]);
    });

    it("should handle malformed exports gracefully", () => {
      const content = `export PATH=/usr/local/bin:$PATH
export incomplete
export EDITOR=vim`;

      const result = parseExports(content);

      expect(result).toEqual([
        { variable: "PATH", value: "/usr/local/bin:$PATH" },
        { variable: "EDITOR", value: "vim" },
      ]);
    });

    it("should handle exports with quoted values", () => {
      const content = `export TEST_VAR="quoted value"
export ANOTHER_VAR='single quoted'`;

      const result = parseExports(content);

      expect(result).toEqual([
        { variable: "TEST_VAR", value: '"quoted value"' },
        { variable: "ANOTHER_VAR", value: "'single quoted'" },
      ]);
    });

    it("should handle exports with special characters in variable names", () => {
      const content = `export PATH=/usr/local/bin:$PATH
export PYTHON_PATH=/usr/local/bin/python
export NODE_ENV=development`;

      const result = parseExports(content);

      expect(result).toEqual([
        { variable: "PATH", value: "/usr/local/bin:$PATH" },
        { variable: "PYTHON_PATH", value: "/usr/local/bin/python" },
        { variable: "NODE_ENV", value: "development" },
      ]);
    });
  });

  describe("parsePathEntries", () => {
    it("should parse export PATH statements", () => {
      const content = `export PATH="/usr/local/bin:$PATH"`;

      const result = parsePathEntries(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ entry: "/usr/local/bin:$PATH", type: "export" });
    });

    it("should parse path+= array append syntax", () => {
      const content = `path+=(/usr/local/bin /opt/homebrew/bin)`;

      const result = parsePathEntries(content);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ entry: "/usr/local/bin", type: "append" });
      expect(result[1]).toEqual({ entry: "/opt/homebrew/bin", type: "append" });
    });

    it("should parse path= array set syntax", () => {
      const content = `path=(/usr/local/bin /usr/bin)`;

      const result = parsePathEntries(content);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ entry: "/usr/local/bin", type: "set" });
      expect(result[1]).toEqual({ entry: "/usr/bin", type: "set" });
    });

    it("should parse PATH=$PATH:... append syntax", () => {
      const content = `PATH="$PATH:/usr/local/bin"`;

      const result = parsePathEntries(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ entry: "/usr/local/bin", type: "append" });
    });

    it("should parse PATH=...:$PATH prepend syntax", () => {
      const content = `PATH="$HOME/bin:$PATH"`;

      const result = parsePathEntries(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ entry: "$HOME/bin", type: "prepend" });
    });

    it("should handle multiple PATH modifications", () => {
      const content = `export PATH="/opt/local/bin:$PATH"
path+=(/usr/local/go/bin)
PATH="$PATH:/usr/local/mysql/bin"`;

      const result = parsePathEntries(content);

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.type)).toContain("export");
      expect(result.map((r) => r.type)).toContain("append");
    });

    it("should return empty array for content with no PATH modifications", () => {
      const content = `alias ll='ls -la'
export EDITOR=vim`;

      const result = parsePathEntries(content);

      expect(result).toEqual([]);
    });

    it("should return empty array for empty content", () => {
      const result = parsePathEntries("");
      expect(result).toEqual([]);
    });

    it("should handle leading whitespace", () => {
      const content = `  export PATH="/usr/local/bin:$PATH"`;

      const result = parsePathEntries(content);

      expect(result).toHaveLength(1);
    });

    it("should handle PATH with variable expansions", () => {
      const content = `export PATH="$HOME/.cargo/bin:$PATH"`;

      const result = parsePathEntries(content);

      expect(result).toHaveLength(1);
      expect(result[0]!.entry).toContain("$HOME");
    });
  });

  describe("parseFpathEntries", () => {
    it("should parse export FPATH statements", () => {
      const content = `export FPATH="$HOME/.zfunc:$FPATH"`;

      const result = parseFpathEntries(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ entry: "$HOME/.zfunc:$FPATH", type: "export" });
    });

    it("should parse fpath+= array append syntax", () => {
      const content = `fpath+=($HOME/.zfunc /usr/local/share/zsh/site-functions)`;

      const result = parseFpathEntries(content);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ entry: "$HOME/.zfunc", type: "append" });
      expect(result[1]).toEqual({ entry: "/usr/local/share/zsh/site-functions", type: "append" });
    });

    it("should parse fpath= array set syntax", () => {
      const content = `fpath=($fpath ~/.zfunc)`;

      const result = parseFpathEntries(content);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ entry: "$fpath", type: "set" });
      expect(result[1]).toEqual({ entry: "~/.zfunc", type: "set" });
    });

    it("should parse FPATH=$FPATH:... append syntax", () => {
      const content = `FPATH="$FPATH:$HOME/.zfunc"`;

      const result = parseFpathEntries(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ entry: "$HOME/.zfunc", type: "append" });
    });

    it("should return empty array for content with no FPATH modifications", () => {
      const content = `alias ll='ls -la'
export PATH=/usr/bin:$PATH`;

      const result = parseFpathEntries(content);

      expect(result).toEqual([]);
    });

    it("should return empty array for empty content", () => {
      const result = parseFpathEntries("");
      expect(result).toEqual([]);
    });

    it("should handle leading whitespace", () => {
      const content = `  fpath+=($HOME/.zfunc)`;

      const result = parseFpathEntries(content);

      expect(result).toHaveLength(1);
    });

    it("should handle multiple FPATH modifications", () => {
      const content = `export FPATH="$HOME/.completions:$FPATH"
fpath+=(/custom/completions)`;

      const result = parseFpathEntries(content);

      expect(result).toHaveLength(2);
    });
  });

  describe("parseKeybindings", () => {
    it("should parse basic bindkey commands", () => {
      const content = `bindkey '^[[A' history-search-backward`;

      const result = parseKeybindings(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ key: "^[[A", command: "history-search-backward" });
    });

    it("should parse bindkey with quoted keys", () => {
      const content = `bindkey "^[[B" history-search-forward`;

      const result = parseKeybindings(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ key: "^[[B", command: "history-search-forward" });
    });

    it("should parse bindkey with single-quoted keys", () => {
      const content = `bindkey '^R' history-incremental-search-backward`;

      const result = parseKeybindings(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ key: "^R", command: "history-incremental-search-backward" });
    });

    it("should parse bindkey -s string replacement", () => {
      const content = `bindkey -s '^[[Z' 'ls -la'`;

      const result = parseKeybindings(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        key: "^[[Z",
        command: "ls -la",
        widget: "string-replacement",
      });
    });

    it("should parse multiple keybindings", () => {
      const content = `bindkey '^[[A' history-search-backward
bindkey '^[[B' history-search-forward
bindkey '^R' history-incremental-search-backward`;

      const result = parseKeybindings(content);

      expect(result).toHaveLength(3);
    });

    it("should return empty array for content with no keybindings", () => {
      const content = `alias ll='ls -la'
export PATH=/usr/bin:$PATH`;

      const result = parseKeybindings(content);

      expect(result).toEqual([]);
    });

    it("should return empty array for empty content", () => {
      const result = parseKeybindings("");
      expect(result).toEqual([]);
    });

    it("should handle leading whitespace", () => {
      const content = `  bindkey '^P' up-line-or-history`;

      const result = parseKeybindings(content);

      expect(result).toHaveLength(1);
    });

    it("should parse keybindings with custom widgets", () => {
      const content = `bindkey '^X^E' edit-command-line`;

      const result = parseKeybindings(content);

      expect(result).toHaveLength(1);
      expect(result[0]!.command).toBe("edit-command-line");
    });

    it("should handle escape sequences in keys", () => {
      const content = `bindkey "^[." insert-last-word`;

      const result = parseKeybindings(content);

      expect(result).toHaveLength(1);
      expect(result[0]!.key).toBe("^[.");
    });

    it("should parse vi command mode keybindings", () => {
      const content = `bindkey -M vicmd k vi-up-line-or-history`;

      const result = parseKeybindings(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        key: "k",
        command: "vi-up-line-or-history",
        keymap: "vicmd",
      });
    });

    it("should parse vi insert mode keybindings", () => {
      const content = `bindkey -M viins '^[[A' history-search-backward`;

      const result = parseKeybindings(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        key: "^[[A",
        command: "history-search-backward",
        keymap: "viins",
      });
    });

    it("should parse emacs mode keybindings", () => {
      const content = `bindkey -M emacs '^A' beginning-of-line`;

      const result = parseKeybindings(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        key: "^A",
        command: "beginning-of-line",
        keymap: "emacs",
      });
    });

    it("should parse keymap-specific string replacement", () => {
      const content = `bindkey -M vicmd -s 'q' ':wq'`;

      const result = parseKeybindings(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        key: "q",
        command: ":wq",
        widget: "string-replacement",
        keymap: "vicmd",
      });
    });

    it("should parse mixed keybindings (with and without keymap)", () => {
      const content = `bindkey '^R' history-incremental-search-backward
bindkey -M vicmd k vi-up-line-or-history
bindkey -M vicmd j vi-down-line-or-history
bindkey -M viins '^P' up-line-or-history`;

      const result = parseKeybindings(content);

      expect(result).toHaveLength(4);

      const globalBinding = result.find((r) => r.key === "^R" && !r.keymap);
      expect(globalBinding).toBeDefined();
      expect(globalBinding?.command).toBe("history-incremental-search-backward");

      const vicmdBindings = result.filter((r) => r.keymap === "vicmd");
      expect(vicmdBindings).toHaveLength(2);

      const viinsBinding = result.find((r) => r.keymap === "viins");
      expect(viinsBinding).toBeDefined();
      expect(viinsBinding?.command).toBe("up-line-or-history");
    });

    it("should handle custom keymaps", () => {
      const content = `bindkey -M mymap '^X' custom-widget`;

      const result = parseKeybindings(content);

      expect(result).toHaveLength(1);
      expect(result[0]!.keymap).toBe("mymap");
    });

    it("should not duplicate entries for same binding", () => {
      const content = `bindkey -M vicmd 'k' vi-up-line-or-history`;

      const result = parseKeybindings(content);

      // Should only have one entry, not duplicated by multiple regex matches
      expect(result).toHaveLength(1);
    });

    it("should ignore bindkey flag-only commands", () => {
      const content = `bindkey -d '^A'
bindkey -e
bindkey -v
bindkey -a
bindkey -r '^X'`;

      const result = parseKeybindings(content);

      // These are flag commands (delete, select emacs, select vi, select vicmd, remove)
      // They should not be parsed as key bindings
      expect(result).toHaveLength(0);
    });
  });
});
