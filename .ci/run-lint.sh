#!/usr/bin/env bash

set -euxo pipefail
ROOT=$PWD

function run_lint {
  echo "=== Running $1 lint ==="
  npm --prefix $ROOT/$1 run lint
}

run_lint "utils"
run_lint "helpers"
run_lint "loggers/winston"
run_lint "loggers/morgan"
run_lint "loggers/pino"
