#!/usr/bin/env bash

set -euxo pipefail
ROOT=$PWD

if [[ $(npm --version | cut -d. -f1) -ge 7 ]]; then
  npm --workspaces install
else
  # Fallback for npm <7, effectively for node <16.
  function run_install {
    echo "=== Installing dependencies in $1 ==="
    npm --prefix $ROOT/$1 install
  }
  ls -d packages/* | while read d; do run_install $d; done
fi
