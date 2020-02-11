#!/usr/bin/env bash

set -euxo pipefail
ROOT=$PWD

function run_install {
  echo "=== Installing dependencies in $1 ==="
  npm --prefix $ROOT/$1 install
}

run_install "helpers"
run_install "loggers/winston"
run_install "loggers/morgan"
