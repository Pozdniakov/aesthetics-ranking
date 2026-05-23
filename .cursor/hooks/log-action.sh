#!/usr/bin/env bash
# Logs file edits and shell commands to AGENT_LOG.md in the project root.
# Receives event JSON on stdin.

PROJECT_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null)"
LOG_FILE="${PROJECT_ROOT}/AGENT_LOG.md"
NOW=$(date '+%Y-%m-%d %H:%M:%S')

# Parse event type and relevant fields from stdin
INPUT=$(cat)
TOOL=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('path','') or d.get('tool_input',{}).get('target_file',''))" 2>/dev/null)
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command','')[:120])" 2>/dev/null)

# Ensure log file has a header on first run
if [ ! -f "$LOG_FILE" ]; then
  cat > "$LOG_FILE" <<'HEADER'
# Agent Action Log

Автоматический лог изменений, вносимых AI-агентом.

| Время | Инструмент | Описание |
|-------|-----------|----------|
HEADER
fi

# Append entry based on tool type
if [[ "$TOOL" == "Write" || "$TOOL" == "StrReplace" || "$TOOL" == "Delete" ]]; then
  REL_PATH="${FILE_PATH#$PROJECT_ROOT/}"
  echo "| $NOW | $TOOL | \`$REL_PATH\` |" >> "$LOG_FILE"
elif [[ "$TOOL" == "Shell" && -n "$COMMAND" ]]; then
  echo "| $NOW | Shell | \`$COMMAND\` |" >> "$LOG_FILE"
fi

echo '{}' # allow action
exit 0
