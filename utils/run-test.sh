#!/usr/bin/env bash

set -euxo pipefail
ROOT=$PWD

# Use quite long 'tap ...' test runner timeout for possibly slow CI.
export TAP_TIMEOUT=300

if [[ $(npm --version | cut -d. -f1) -ge 7 ]]; then
  npm --workspaces test
else
  # Fallback for npm <7, effectively for node <16.
  function run_test {
    echo "=== Running $1 test ==="
    npm --prefix $ROOT/$1 test
  }
  ls -d packages/* | while read d; do run_test $d; done
fi
