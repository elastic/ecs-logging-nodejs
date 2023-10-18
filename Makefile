# All development tasks are typically available via npm scripts, i.e.
# `npm run <script> ...` or via CI scripts (".ci/*.sh"). This Makefile
# exists as a convenience for some common tasks.

.PHONY: all
all:
	./utils/run-install.sh

.PHONY: test
test:
	./utils/run-test.sh

.PHONY: lint
lint: check-license-headers
	./utils/run-lint.sh

.PHONY: fmt
fmt:
	npm --workspaces lint:fix # requires npm>=7 (aka node>=16)

# Build and open the rendered docs for testing.
#
# Requirements:
# - Docker is running
# - "../docs" is an elastic/docs.git clone
# - "../ecs-logging" is an elastic/ecs-logging.git clone
.PHONY: docs-and-open
docs-and-open:
	export GIT_HOME=$(shell cd .. && pwd) && \
		$$GIT_HOME/docs/build_docs \
			--resource $$GIT_HOME/ecs-logging/docs/ --chunk 1 --open \
			--doc $$PWD/docs/index.asciidoc

# List licenses of prod deps.
.PHONY: list-licenses
list-licenses:
	@for dir in helpers $(shell ls -d packages/*); do \
		(cd $$dir && npm ls --prod --parseable | while read subdir; do node -e "console.log(require('$$subdir/package.json').license)"; done) \
	done | sort | uniq -c | sort -n

.PHONY: check-license-headers
check-license-headers:
	@bash utils/check-license-headers.sh

.PHONY: setup-pre-commit-hook
setup-pre-commit-hook:
	@cp utils/pre-commit-hook.sh .git/hooks/pre-commit
	@chmod 751 .git/hooks/pre-commit
