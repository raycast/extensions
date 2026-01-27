import { findMatchingSection, detectUserSectionFormat, generateSectionHeader } from "../lib/section-writer";

describe("section-writer", () => {
  describe("findMatchingSection", () => {
    describe("exact matches", () => {
      it("should match exact section name", () => {
        const content = `# --- Git Aliases --- #
alias g='git'
`;
        const result = findMatchingSection(content, "Git Aliases");
        expect(result).not.toBeNull();
        expect(result?.marker.name).toBe("Git Aliases");
      });

      it("should match case-insensitively", () => {
        const content = `# --- git aliases --- #
alias g='git'
`;
        const result = findMatchingSection(content, "Git Aliases");
        expect(result).not.toBeNull();
      });
    });

    describe("core name matching", () => {
      it("should match 'Git Aliases' to existing 'Git' section", () => {
        const content = `# --- Git --- #
alias g='git'
`;
        const result = findMatchingSection(content, "Git Aliases");
        expect(result).not.toBeNull();
        expect(result?.marker.name).toBe("Git");
      });

      it("should match 'Git Aliases' to existing 'Git Stuff' section", () => {
        const content = `# --- Git Stuff --- #
alias g='git'
`;
        const result = findMatchingSection(content, "Git Aliases");
        expect(result).not.toBeNull();
        expect(result?.marker.name).toBe("Git Stuff");
      });

      it("should match 'Git Aliases' to existing 'Git Config' section", () => {
        const content = `# --- Git Config --- #
alias g='git'
`;
        const result = findMatchingSection(content, "Git Aliases");
        expect(result).not.toBeNull();
        expect(result?.marker.name).toBe("Git Config");
      });

      it("should match 'Docker' to existing 'Docker Aliases' section", () => {
        const content = `# --- Docker Aliases --- #
alias d='docker'
`;
        const result = findMatchingSection(content, "Docker");
        expect(result).not.toBeNull();
        expect(result?.marker.name).toBe("Docker Aliases");
      });
    });

    describe("false positive prevention", () => {
      it("should NOT match 'Git' to 'Digital' section", () => {
        const content = `# --- Digital --- #
alias d='digital-ocean'
`;
        const result = findMatchingSection(content, "Git Aliases");
        expect(result).toBeNull();
      });

      it("should NOT match 'Go' to 'Google' section (short core)", () => {
        const content = `# --- Google --- #
alias gc='gcloud'
`;
        const result = findMatchingSection(content, "Go Aliases");
        // "go" is only 2 chars, so prefix matching shouldn't trigger
        // and "go" !== "google", so no match
        expect(result).toBeNull();
      });

      it("should NOT match 'Rust' to 'Trust' section", () => {
        const content = `# --- Trust --- #
alias t='trust'
`;
        const result = findMatchingSection(content, "Rust Aliases");
        expect(result).toBeNull();
      });

      it("should match 'Node' to 'Nodemon' via prefix matching", () => {
        const content = `# --- Nodemon Config --- #
alias nm='nodemon'
`;
        // "node" vs "nodemon" - nodemon starts with node, both >= 3 chars
        // This SHOULD match via prefix matching since they're related
        const result = findMatchingSection(content, "Node Aliases");
        expect(result).not.toBeNull();
      });
    });

    describe("best match selection", () => {
      it("should prefer exact match over core match", () => {
        const content = `# --- Git --- #
alias g='git'

# --- Git Aliases --- #
alias ga='git add'
`;
        const result = findMatchingSection(content, "Git Aliases");
        expect(result).not.toBeNull();
        expect(result?.marker.name).toBe("Git Aliases");
      });

      it("should prefer core match over prefix match", () => {
        const content = `# --- Docker --- #
alias d='docker'

# --- Dockercompose --- #
alias dc='docker-compose'
`;
        const result = findMatchingSection(content, "Docker Aliases");
        expect(result).not.toBeNull();
        expect(result?.marker.name).toBe("Docker");
      });
    });

    describe("no match scenarios", () => {
      it("should return null when no sections exist", () => {
        const content = `alias g='git'
alias d='docker'
`;
        const result = findMatchingSection(content, "Git Aliases");
        expect(result).toBeNull();
      });

      it("should return null when no matching section exists", () => {
        const content = `# --- Python --- #
alias py='python3'
`;
        const result = findMatchingSection(content, "Git Aliases");
        expect(result).toBeNull();
      });
    });

    describe("section end detection", () => {
      it("should correctly identify section end line", () => {
        const content = `# --- Git --- #
alias g='git'
alias ga='git add'

# --- Docker --- #
alias d='docker'
`;
        const result = findMatchingSection(content, "Git Aliases");
        expect(result).not.toBeNull();
        expect(result?.marker.name).toBe("Git");
        // End line should be before the Docker section (line 5)
        expect(result?.endLine).toBe(4);
      });
    });
  });

  describe("detectUserSectionFormat", () => {
    it("should detect dashed format", () => {
      const content = `# --- Git --- #
alias g='git'

# --- Docker --- #
alias d='docker'
`;
      expect(detectUserSectionFormat(content)).toBe("dashed");
    });

    it("should detect bracketed format", () => {
      const content = `# [ Git ]
alias g='git'

# [ Docker ]
alias d='docker'
`;
      expect(detectUserSectionFormat(content)).toBe("bracketed");
    });

    it("should detect hash format", () => {
      const content = `# # Git
alias g='git'

# # Docker
alias d='docker'
`;
      expect(detectUserSectionFormat(content)).toBe("hash");
    });

    it("should default to dashed when no sections exist", () => {
      const content = `alias g='git'
alias d='docker'
`;
      expect(detectUserSectionFormat(content)).toBe("dashed");
    });

    it("should return most common format when mixed", () => {
      const content = `# --- Git --- #
alias g='git'

# [ Docker ]
alias d='docker'

# --- Python --- #
alias py='python'

# --- Node --- #
alias n='node'
`;
      // 3 dashed vs 1 bracketed
      expect(detectUserSectionFormat(content)).toBe("dashed");
    });
  });

  describe("generateSectionHeader", () => {
    it("should generate dashed header", () => {
      const header = generateSectionHeader("Git Aliases", "dashed");
      expect(header.start).toBe("# --- Git Aliases --- #");
      expect(header.end).toBe("# --- End Git Aliases --- #");
    });

    it("should generate bracketed header", () => {
      const header = generateSectionHeader("Git Aliases", "bracketed");
      expect(header.start).toBe("# [ Git Aliases ]");
      expect(header.end).toBeUndefined();
    });

    it("should generate hash header", () => {
      const header = generateSectionHeader("Git Aliases", "hash");
      expect(header.start).toBe("# # Git Aliases");
      expect(header.end).toBeUndefined();
    });

    it("should generate labeled header", () => {
      const header = generateSectionHeader("Git Aliases", "labeled");
      expect(header.start).toBe("# section: Git Aliases");
      expect(header.end).toBeUndefined();
    });

    it("should default to dashed format", () => {
      const header = generateSectionHeader("Git Aliases");
      expect(header.start).toBe("# --- Git Aliases --- #");
    });
  });
});
