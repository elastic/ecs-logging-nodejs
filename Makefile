# All development tasks are typically available via npm scripts, i.e.
# `npm run <script> ...` or via CI scripts (".ci/*.sh"). This Makefile
# exists as a convenience for some common tasks.

.PHONY: all
all:
	./.ci/run-install.sh
	(cd utils && npm install)

.PHONY: clean
clean:
	(cd helpers && rm -rf node_modules)
	(cd loggers/winston && rm -rf node_modules)
	(cd loggers/morgan && rm -rf node_modules)
	(cd loggers/pino && rm -rf node_modules)
	(cd utils && rm -rf node_modules)

.PHONY: check
check: check-license-headers
	(cd helpers && npx standard)
	(cd loggers/winston && npx standard)
	(cd loggers/morgan && npx standard)
	(cd loggers/pino && npx standard)
	(cd utils && npx standard)

.PHONY: fmt
fmt:
	(cd helpers && npx standard --fix)
	(cd loggers/winston && npx standard --fix)
	(cd loggers/morgan && npx standard --fix)
	(cd loggers/pino && npx standard --fix)
	(cd utils && npx standard --fix)

.PHONY: test
test:
	./.ci/run-test.sh

# For local dev, setup each logger to use the local helpers, rather than
# a version published to npm. Need to be careful to not *push* with that
# tweak to each package.json.
.PHONY: install-local-helpers undo-install-local-helpers
install-local-helpers:
	(cd loggers/winston && npm install ../../helpers)
	(cd loggers/morgan && npm install ../../helpers)
	(cd loggers/pino && npm install ../../helpers)
undo-install-local-helpers:
	export HELPERS_VER=$(shell cd helpers && npm info . version) && \
		(cd loggers/winston && npm install @elastic/ecs-helpers@v$$HELPERS_VER) && \
		(cd loggers/morgan && npm install @elastic/ecs-helpers@v$$HELPERS_VER) && \
		(cd loggers/pino && npm install @elastic/ecs-helpers@v$$HELPERS_VER)

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
	@for dir in helpers $(shell ls -d loggers/*); do \
		(cd $$dir && npm ls --prod --parseable | while read subdir; do node -e "console.log(require('$$subdir/package.json').license)"; done) \
	done | sort | uniq -c | sort -n

.PHONY: check-license-headers
check-license-headers:
	@bash utils/check-license-headers.sh

.PHONY: setup-pre-commit-hook
setup-pre-commit-hook:
	@cp utils/pre-commit-hook.sh .git/hooks/pre-commit
	@chmod 751 .git/hooks/pre-commit
