const script = `#!/usr/bin/env bash

_<CLI_BIN>_autocomplete()
{

  local cur="\${COMP_WORDS[COMP_CWORD]}" opts IFS=$' \\t\\n'
  COMPREPLY=()

  local commands="
<BASH_COMMANDS_WITH_FLAGS_LIST>
"

  if [[ "$cur" != "-"* ]]; then
    opts=$(printf "$commands" | grep -Eo '^[a-zA-Z0-9:_-]+')
  else
    local __COMP_WORDS
    if [[ \${COMP_WORDS[2]} == ":" ]]; then
      #subcommand
      __COMP_WORDS=$(printf "%s" "\${COMP_WORDS[@]:1:3}")
    else
      #simple command
      __COMP_WORDS="\${COMP_WORDS[@]:1:1}"
    fi
    opts=$(printf "$commands" | grep "\${__COMP_WORDS}" | sed -n "s/^\${__COMP_WORDS} //p")
  fi
  _get_comp_words_by_ref -n : cur
  COMPREPLY=( $(compgen -W "\${opts}" -- \${cur}) )
  __ltrim_colon_completions "$cur"
  return 0

}

complete -o default -F _<CLI_BIN>_autocomplete <CLI_BIN>
`;
export default script;
