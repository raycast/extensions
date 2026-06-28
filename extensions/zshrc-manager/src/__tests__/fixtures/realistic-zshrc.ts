/**
 * Realistic zshrc fixtures for integration testing
 *
 * These fixtures represent real-world zshrc configurations
 * to ensure the parser handles all common patterns.
 */

/**
 * A realistic Oh-My-Zsh based zshrc
 */
export const OhMyZshConfig = `
# --- Oh My Zsh Configuration --- #

# Path to your oh-my-zsh installation
export ZSH="$HOME/.oh-my-zsh"

# Theme
ZSH_THEME="robbyrussell"

# Plugins
plugins=(
  git
  docker
  docker-compose
  npm
  node
  python
  virtualenv
)

source $ZSH/oh-my-zsh.sh

# --- End Oh My Zsh Configuration --- #

# --- User Configuration --- #

# History settings
HISTSIZE=10000
SAVEHIST=10000
HISTFILE=~/.zsh_history

setopt SHARE_HISTORY
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_SPACE

# --- End User Configuration --- #

# --- Aliases --- #

# Navigation
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'

# Git shortcuts
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git log --oneline'
alias gd='git diff'
alias gb='git branch'
alias gco='git checkout'

# Docker shortcuts
alias dc='docker-compose'
alias dps='docker ps'
alias dimg='docker images'

# Development
alias py='python3'
alias pip='pip3'
alias nrd='npm run dev'
alias nrt='npm run test'

# --- End Aliases --- #

# --- Functions --- #

mkcd() {
  mkdir -p "$1" && cd "$1"
}

extract() {
  if [ -f "$1" ]; then
    case "$1" in
      *.tar.bz2) tar xvjf "$1" ;;
      *.tar.gz)  tar xvzf "$1" ;;
      *.zip)     unzip "$1" ;;
      *) echo "Unknown archive format" ;;
    esac
  fi
}

# --- End Functions --- #

# --- Path Configuration --- #

export PATH="$HOME/bin:$PATH"
export PATH="$HOME/.local/bin:$PATH"
export PATH="/usr/local/bin:$PATH"

# --- End Path Configuration --- #

# --- Environment Variables --- #

export EDITOR='vim'
export VISUAL='vim'
export LANG='en_US.UTF-8'
export LC_ALL='en_US.UTF-8'

# Development
export NODE_ENV='development'
export PYTHONDONTWRITEBYTECODE=1

# --- End Environment Variables --- #

# NVM initialization
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# Pyenv initialization
eval "$(pyenv init -)"
eval "$(pyenv virtualenv-init -)"

# Keybindings
bindkey '^R' history-incremental-search-backward
bindkey '^A' beginning-of-line
bindkey '^E' end-of-line
`;

/**
 * A minimal zshrc with edge cases
 */
export const MinimalWithEdgeCases = `
# Single alias with special characters
alias grep='grep --color=auto'

# Alias with double quotes
alias ll="ls -la"

# Export without quotes
export PATH=$HOME/bin:$PATH

# Export with single quotes
export EDITOR='vim'

# Multi-word alias value
alias ga='git add --all'

# Alias with pipe
alias psg='ps aux | grep'

# Function with complex body
my_func() {
  local var="test"
  echo "$var"
}

# Source with variable
source $HOME/.zsh_custom

# Source with tilde
source ~/.zsh_local
`;

/**
 * Configuration with duplicates and potential issues
 */
export const ConfigWithIssues = `
# Duplicate aliases
alias ll='ls -l'
alias ll='ls -la'

# Duplicate exports
export PATH=/usr/local/bin:$PATH
export PATH=/usr/bin:$PATH

# Alias shadowing system command
alias ls='ls -G'
alias grep='grep --color=auto'
alias cat='bat'

# Broken source (for testing)
source ~/.nonexistent_file

# Very long line that might cause issues
export VERY_LONG_VAR="this is a very long value that goes on and on and on and on and on and on and on and on and on and on and on and on and on and on and on"
`;

/**
 * Configuration with various section formats
 */
export const MixedSectionFormats = `
# Section: Standard Section
alias a1='cmd1'

# --- Dashed Section --- #
alias a2='cmd2'
# --- End Dashed Section --- #

# [ Bracketed Section ]
alias a3='cmd3'

## Hash Section
alias a4='cmd4'

# @start Custom Section
alias a5='cmd5'
# @end Custom Section
`;

/**
 * Empty/minimal configuration
 */
export const EmptyConfig = `
# Empty zshrc file
`;

/**
 * Configuration with unicode and special characters
 */
export const UnicodeConfig = `
# Emoji in comment 🎉
alias hello='echo "Hello, World! 👋"'
export GREETING="Привет мир"
alias test='echo "日本語"'
`;

/**
 * Expected parse results for OhMyZshConfig
 */
export const OhMyZshExpectedResults = {
  aliases: [
    { name: "..", command: "cd .." },
    { name: "...", command: "cd ../.." },
    { name: "....", command: "cd ../../.." },
    { name: "ll", command: "ls -la" },
    { name: "la", command: "ls -A" },
    { name: "l", command: "ls -CF" },
    { name: "gs", command: "git status" },
    { name: "ga", command: "git add" },
    { name: "gc", command: "git commit" },
    { name: "gp", command: "git push" },
    { name: "gl", command: "git log --oneline" },
    { name: "gd", command: "git diff" },
    { name: "gb", command: "git branch" },
    { name: "gco", command: "git checkout" },
    { name: "dc", command: "docker-compose" },
    { name: "dps", command: "docker ps" },
    { name: "dimg", command: "docker images" },
    { name: "py", command: "python3" },
    { name: "pip", command: "pip3" },
    { name: "nrd", command: "npm run dev" },
    { name: "nrt", command: "npm run test" },
  ],
  exports: [
    { variable: "ZSH", value: '"$HOME/.oh-my-zsh"' },
    { variable: "PATH", value: '"$HOME/bin:$PATH"' },
    { variable: "PATH", value: '"$HOME/.local/bin:$PATH"' },
    { variable: "PATH", value: '"/usr/local/bin:$PATH"' },
    { variable: "EDITOR", value: "'vim'" },
    { variable: "VISUAL", value: "'vim'" },
    { variable: "LANG", value: "'en_US.UTF-8'" },
    { variable: "LC_ALL", value: "'en_US.UTF-8'" },
    { variable: "NODE_ENV", value: "'development'" },
    { variable: "PYTHONDONTWRITEBYTECODE", value: "1" },
    { variable: "NVM_DIR", value: '"$HOME/.nvm"' },
  ],
  functions: [{ name: "mkcd" }, { name: "extract" }],
  plugins: ["git", "docker", "docker-compose", "npm", "node", "python", "virtualenv"],
  sources: ["$ZSH/oh-my-zsh.sh", '"$NVM_DIR/nvm.sh"'],
  setopts: ["SHARE_HISTORY", "HIST_IGNORE_DUPS", "HIST_IGNORE_SPACE"],
  evals: ['"$(pyenv init -)"', '"$(pyenv virtualenv-init -)"'],
};
