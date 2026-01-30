import * as ejs from 'ejs';
import { EOL } from 'node:os';
import { format } from 'node:util';
export default class PowerShellComp {
    config;
    _coTopics;
    commands;
    topics;
    constructor(config) {
        this.config = config;
        this.topics = this.getTopics();
        this.commands = this.getCommands();
    }
    get coTopics() {
        if (this._coTopics)
            return this._coTopics;
        const coTopics = [];
        for (const topic of this.topics) {
            for (const cmd of this.commands) {
                if (topic.name === cmd.id) {
                    coTopics.push(topic.name);
                }
            }
        }
        this._coTopics = coTopics;
        return this._coTopics;
    }
    generate() {
        const genNode = (partialId) => {
            const node = {};
            const nextArgs = [];
            const depth = partialId.split(':').length;
            for (const t of this.topics) {
                const topicNameSplit = t.name.split(':');
                if (t.name.startsWith(partialId + ':') && topicNameSplit.length === depth + 1) {
                    nextArgs.push(topicNameSplit[depth]);
                    node[topicNameSplit[depth]] = this.coTopics.includes(t.name)
                        ? {
                            ...genNode(`${partialId}:${topicNameSplit[depth]}`),
                        }
                        : {
                            _summary: t.description,
                            ...genNode(`${partialId}:${topicNameSplit[depth]}`),
                        };
                }
            }
            for (const c of this.commands) {
                const cmdIdSplit = c.id.split(':');
                if (partialId === c.id && this.coTopics.includes(c.id)) {
                    node._command = c.id;
                }
                if (c.id.startsWith(partialId + ':') &&
                    cmdIdSplit.length === depth + 1 &&
                    !nextArgs.includes(cmdIdSplit[depth])) {
                    node[cmdIdSplit[depth]] = {
                        _command: c.id,
                    };
                }
            }
            return node;
        };
        const commandTree = {};
        const topLevelArgs = [];
        // Collect top-level topics and generate a cmd tree node for each one of them.
        for (const t of this.topics) {
            if (!t.name.includes(':')) {
                commandTree[t.name] = this.coTopics.includes(t.name)
                    ? {
                        ...genNode(t.name),
                    }
                    : {
                        _summary: t.description,
                        ...genNode(t.name),
                    };
                topLevelArgs.push(t.name);
            }
        }
        // Collect top-level commands and add a cmd tree node with the command ID.
        for (const c of this.commands) {
            if (!c.id.includes(':') && !this.coTopics.includes(c.id)) {
                commandTree[c.id] = {
                    _command: c.id,
                };
                topLevelArgs.push(c.id);
            }
        }
        const hashtables = [];
        for (const topLevelArg of topLevelArgs) {
            // Generate all the hashtables for each child node of a top-level arg.
            hashtables.push(this.genHashtable(topLevelArg, commandTree));
        }
        const commandsHashtable = `
@{
${hashtables.join('\n')}
}`;
        const compRegister = `
using namespace System.Management.Automation
using namespace System.Management.Automation.Language

$scriptblock = {
    param($WordToComplete, $CommandAst, $CursorPosition)

    $Commands =${commandsHashtable}

    # Get the current mode
    $Mode = (Get-PSReadLineKeyHandler | Where-Object {$_.Key -eq "Tab" }).Function

    # Everything in the current line except the CLI executable name.
    $CurrentLine = $commandAst.CommandElements[1..$commandAst.CommandElements.Count] -split " "

    # Remove $WordToComplete from the current line.
    if ($WordToComplete -ne "") {
      if ($CurrentLine.Count -eq 1) {
        $CurrentLine = @()
      } else {
        $CurrentLine = $CurrentLine[0..$CurrentLine.Count]
      }
    }

    # Save flags in current line without the \`--\` prefix.
    $Flags = $CurrentLine | Where-Object {
      $_ -Match "^-{1,2}(\\w+)"
    } | ForEach-Object {
      $_.trim("-")
    }
    # Set $flags to an empty hashtable if there are no flags in the current line.
    if ($Flags -eq $null) {
      $Flags = @{}
    }

    # No command in the current line, suggest top-level args.
    if ($CurrentLine.Count -eq 0) {
        $Commands.GetEnumerator() | Where-Object {
            $_.Key.StartsWith("$WordToComplete")
          } | Sort-Object -Property key | ForEach-Object {
          New-Object -Type CompletionResult -ArgumentList \`
              $($Mode -eq "MenuComplete" ? "$($_.Key) " : "$($_.Key)"),
              $_.Key,
              "ParameterValue",
              "$($_.Value._summary ?? $_.Value._command.summary ?? " ")"
          }
    } else {
      # Start completing command/topic/coTopic

      $NextArg = $null
      $PrevNode = $null

      # Iterate over the current line to find the command/topic/coTopic hashtable
      $CurrentLine | ForEach-Object {
        if ($NextArg -eq $null) {
          $NextArg = $Commands[$_]
        } elseif ($PrevNode[$_] -ne $null) {
          $NextArg = $PrevNode[$_]
        } elseif ($_.StartsWith('-')) {
          return
        } else {
          $NextArg = $PrevNode
        }

        $PrevNode = $NextArg
      }

      # Start completing command.
      if ($NextArg._command -ne $null) {
          # Complete flags
          # \`cli config list -<TAB>\`
          if ($WordToComplete -like '-*') {
              $NextArg._command.flags.GetEnumerator() | Sort-Object -Property key
                  | Where-Object {
                      # Filter out already used flags (unless \`flag.multiple = true\`).
                      $_.Key.StartsWith("$($WordToComplete.Trim("-"))") -and ($_.Value.multiple -eq $true -or !$flags.Contains($_.Key))
                  }
                  | ForEach-Object {
                      New-Object -Type CompletionResult -ArgumentList \`
                          $($Mode -eq "MenuComplete" ? "--$($_.Key) " : "--$($_.Key)"),
                          $_.Key,
                          "ParameterValue",
                          "$($NextArg._command.flags[$_.Key].summary ?? " ")"
                  }
          } else {
              # This could be a coTopic. We remove the "_command" hashtable
              # from $NextArg and check if there's a command under the current partial ID.
              $NextArg.remove("_command")

              if ($NextArg.keys -gt 0) {
                  $NextArg.GetEnumerator() | Where-Object {
                      $_.Key.StartsWith("$WordToComplete")
                    } | Sort-Object -Property key | ForEach-Object {
                    New-Object -Type CompletionResult -ArgumentList \`
                      $($Mode -eq "MenuComplete" ? "$($_.Key) " : "$($_.Key)"),
                      $_.Key,
                      "ParameterValue",
                      "$($NextArg[$_.Key]._summary ?? " ")"
                  }
              }
          }
      } else {
          # Start completing topic.

          # Topic summary is stored as "_summary" in the hashtable.
          # At this stage it is no longer needed so we remove it
          # so that $NextArg contains only commands/topics hashtables

          $NextArg.remove("_summary")

          $NextArg.GetEnumerator() | Where-Object {
                $_.Key.StartsWith("$WordToComplete")
              } | Sort-Object -Property key | ForEach-Object {
              New-Object -Type CompletionResult -ArgumentList \`
                  $($Mode -eq "MenuComplete" ? "$($_.Key) " : "$($_.Key)"),
                  $_.Key,
                  "ParameterValue",
                  "$($NextArg[$_.Key]._summary ?? $NextArg[$_.Key]._command.summary ?? " ")"
          }
      }
    }
}
Register-ArgumentCompleter -Native -CommandName ${this.config.binAliases
            ? `@(${[...this.config.binAliases, this.config.bin].map((alias) => `"${alias}"`).join(',')})`
            : this.config.bin} -ScriptBlock $scriptblock
`;
        return compRegister;
    }
    genCmdHashtable(cmd) {
        const flaghHashtables = [];
        const flagNames = Object.keys(cmd.flags);
        // Add comp for the global `--help` flag.
        if (!flagNames.includes('help')) {
            flaghHashtables.push('    "help" = @{ "summary" = "Show help for command" }');
        }
        if (flagNames.length > 0) {
            for (const flagName of flagNames) {
                const f = cmd.flags[flagName];
                // skip hidden flags
                if (f.hidden)
                    continue;
                const flagSummary = this.sanitizeSummary(f.summary ?? f.description);
                if (f.type === 'option' && f.multiple) {
                    flaghHashtables.push(`    "${f.name}" = @{
      "summary" = "${flagSummary}"
      "multiple" = $true
}`);
                }
                else {
                    flaghHashtables.push(`    "${f.name}" = @{ "summary" = "${flagSummary}" }`);
                }
            }
        }
        const cmdHashtable = `@{
  "summary" = "${cmd.summary}"
  "flags" = @{
${flaghHashtables.join('\n')}
  }
}`;
        return cmdHashtable;
    }
    genHashtable(key, node, leafTpl) {
        if (!leafTpl) {
            leafTpl = `"${key}" = @{
%s
}
`;
        }
        const nodeKeys = Object.keys(node[key]);
        // this is a topic
        if (nodeKeys.includes('_summary')) {
            let childTpl = `"_summary" = "${node[key]._summary}"\n%s`;
            const newKeys = nodeKeys.filter((k) => k !== '_summary');
            if (newKeys.length > 0) {
                const childNodes = [];
                for (const newKey of newKeys) {
                    childNodes.push(this.genHashtable(newKey, node[key]));
                }
                childTpl = format(childTpl, childNodes.join('\n'));
                return format(leafTpl, childTpl);
            }
            // last node
            return format(leafTpl, childTpl);
        }
        const childNodes = [];
        for (const k of nodeKeys) {
            if (k === '_command') {
                const cmd = this.commands.find((c) => c.id === node[key][k]);
                if (!cmd)
                    throw new Error('no command');
                childNodes.push(format('"_command" = %s', this.genCmdHashtable(cmd)));
            }
            else if (node[key][k]._command) {
                const cmd = this.commands.find((c) => c.id === node[key][k]._command);
                if (!cmd)
                    throw new Error('no command');
                childNodes.push(format(`"${k}" = @{\n"_command" = %s\n}`, this.genCmdHashtable(cmd)));
            }
            else {
                const childTpl = `"summary" = "${node[key][k]._summary}"\n"${k}" = @{ \n    %s\n   }`;
                childNodes.push(this.genHashtable(k, node[key], childTpl));
            }
        }
        if (childNodes.length > 0) {
            return format(leafTpl, childNodes.join('\n'));
        }
        return leafTpl;
    }
    getCommands() {
        const cmds = [];
        for (const p of this.config.getPluginsList()) {
            for (const c of p.commands) {
                if (c.hidden)
                    continue;
                const summary = this.sanitizeSummary(c.summary ?? c.description);
                const { flags } = c;
                cmds.push({
                    flags,
                    id: c.id,
                    summary,
                });
                for (const a of c.aliases) {
                    cmds.push({
                        flags,
                        id: a,
                        summary,
                    });
                    const split = a.split(':');
                    let topic = split[0];
                    // Completion funcs are generated from topics:
                    // `force` -> `force:org` -> `force:org:open|list`
                    //
                    // but aliases aren't guaranteed to follow the plugin command tree
                    // so we need to add any missing topic between the starting point and the alias.
                    for (let i = 0; i < split.length - 1; i++) {
                        if (!this.topics.some((t) => t.name === topic)) {
                            this.topics.push({
                                description: `${topic.replaceAll(':', ' ')} commands`,
                                name: topic,
                            });
                        }
                        topic += `:${split[i + 1]}`;
                    }
                }
            }
        }
        return cmds;
    }
    getTopics() {
        const topics = this.config.topics
            .filter((topic) => {
            // it is assumed a topic has a child if it has children
            const hasChild = this.config.topics.some((subTopic) => subTopic.name.includes(`${topic.name}:`));
            return hasChild;
        })
            .sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        })
            .map((t) => {
            const description = t.description
                ? this.sanitizeSummary(t.description)
                : `${t.name.replaceAll(':', ' ')} commands`;
            return {
                description,
                name: t.name,
            };
        });
        return topics;
    }
    sanitizeSummary(summary) {
        if (summary === undefined) {
            // PowerShell:
            // [System.Management.Automation.CompletionResult] will error out if will error out if you pass in an empty string for the summary.
            return ' ';
        }
        return ejs
            .render(summary, { config: this.config })
            .replaceAll('"', '""') // escape double quotes.
            .replaceAll('`', '``') // escape backticks.
            .split(EOL)[0]; // only use the first line
    }
}
