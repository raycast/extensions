import { parseAliases, parseExports } from "../utils/parsers";

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
});
