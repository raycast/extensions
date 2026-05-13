export type ShellBuddyArguments = {
  prompt?: string;
};

export type CommandHistoryItem = {
  prompt: string;
  command: string;
};

export type KnownPrompts = {
  [prompt: string]: string;
};

export type Context = {
  os: string;
  shell: string;
  cwd: string;
  repoRoot: string;
};
