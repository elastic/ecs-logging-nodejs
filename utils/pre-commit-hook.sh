#!/usr/bin/env bash

# An optional git pre-commit hook for developer convenience.

set -o errexit
set -o pipefail

make check
