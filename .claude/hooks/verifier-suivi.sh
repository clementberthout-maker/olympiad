#!/usr/bin/env bash
# Hook Stop : empêche Claude de terminer son tour si des fichiers du projet
# ont été modifiés plus récemment que SUIVI-PROJET.md (voir CLAUDE.md).

entree=$(cat)
# Évite une boucle infinie : si on a déjà bloqué une fois, on laisse passer.
if printf '%s' "$entree" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

racine="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
cd "$racine" 2>/dev/null || exit 0
suivi="SUIVI-PROJET.md"
[ -f "$suivi" ] || exit 0

# Fichiers modifiés ou nouveaux (non commités), hors fichier de suivi.
modifies=$(git status --porcelain --untracked-files=all 2>/dev/null \
  | sed -E 's/^.{3}//; s/.* -> //; s/^"(.*)"$/\1/' \
  | grep -Ev '^(SUIVI-PROJET\.md|\.claude/|\.idea/|\.expo/|node_modules/)' )
[ -z "$modifies" ] && exit 0

# Bloque seulement si au moins un de ces fichiers est plus récent que le suivi.
plus_recents=""
while IFS= read -r f; do
  if [ -e "$f" ] && [ -n "$(find "$f" -maxdepth 0 -newer "$suivi" 2>/dev/null)" ]; then
    plus_recents="$plus_recents $f"
  fi
done <<< "$modifies"
[ -z "$plus_recents" ] && exit 0

cat <<EOF
{"decision": "block", "reason": "Des fichiers du projet ont été modifiés (${plus_recents# }) sans mise à jour de SUIVI-PROJET.md. Mets-le à jour comme indiqué dans CLAUDE.md (date, ce qui a été fait, étapes cochées, journal), puis termine."}
EOF
exit 0
