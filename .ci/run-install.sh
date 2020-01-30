#!/usr/bin/env bash

set -euxo pipefail
ROOT=$PWD

function run_install {
  echo "=== Installing dependencies in $1 ==="
  cd $1
  npm install
  cd $ROOT
}

run_install "helper"
run_install "loggers/winston"
run_install "loggers/morgan"
