#!/usr/bin/env bash

set -euxo pipefail
ROOT=$PWD

function run_test {
  echo "=== Running $1 test ==="
  npm --prefix $ROOT/$1 test
}

# Use quite long 'tap ...' test runner timeout for possibly slow CI.
export TAP_TIMEOUT=300

run_test "helpers"
run_test "loggers/winston"
run_test "loggers/morgan"
run_test "loggers/pino"
