# All development tasks are typically available via npm scripts, i.e.
# `npm run <script> ...` or via CI scripts (".ci/*.sh"). This Makefile
# exists as a convenience for some common tasks.

.PHONY: all
all:
	./.ci/run-install.sh

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
