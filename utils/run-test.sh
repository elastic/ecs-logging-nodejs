set -euxo pipefail
ROOT=$PWD

function run_test {
  echo "=== Running $1 test ==="
  cd $1
  npm install
  npm test
  cd $ROOT
}

run_test "helper"
run_test "loggers/winston"
run_test "loggers/morgan"
