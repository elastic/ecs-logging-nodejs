# All development tasks are typically available via npm scripts, i.e.
# `npm run <script> ...` or via CI scripts (".ci/*.sh"). This Makefile
# exists as a convenience for some common tasks.

.PHONY: all
all:
	./.ci/run-install.sh

.PHONY: clean
clean:
	(cd helpers && rm -rf node_modules)
	(cd loggers/winston && rm -rf node_modules)
	(cd loggers/morgan && rm -rf node_modules)
	(cd loggers/pino && rm -rf node_modules)
	(cd utils && rm -rf node_modules)

.PHONY: check
check:
	(cd helpers && npx standard)
	(cd loggers/winston && npx standard)
	(cd loggers/morgan && npx standard)
	(cd loggers/pino && npx standard)

.PHONY: fmt
fmt:
	(cd helpers && npx standard --fix)
	(cd loggers/winston && npx standard --fix)
	(cd loggers/morgan && npx standard --fix)
	(cd loggers/pino && npx standard --fix)

.PHONY: test
test:
	./.ci/run-test.sh

.PHONY: setup-pre-commit-hook
setup-pre-commit-hook:
	@cp utils/pre-commit-hook.sh .git/hooks/pre-commit
	@chmod 751 .git/hooks/pre-commit
