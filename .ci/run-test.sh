#!/usr/bin/env bash

set -euxo pipefail
ROOT=$PWD

function run_test {
  echo "=== Running $1 test ==="
  npm --prefix $ROOT/$1 test
}

run_test "helpers"
run_test "loggers/winston"
run_test "loggers/morgan"
run_test "loggers/pino"
