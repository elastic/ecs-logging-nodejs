#!/usr/bin/env bash

set -euxo pipefail
ROOT=$PWD

if [[ $(npm --version | cut -d. -f1) -ge 7 ]]; then
  npm --workspaces run lint
else
  # Fallback for npm <7, effectively for node <16.
  function run_lint {
    echo "=== Running $1 lint ==="
    npm --prefix $ROOT/$1 run lint
  }
  ls -d packages/* | while read d; do run_lint $d; done
fi
