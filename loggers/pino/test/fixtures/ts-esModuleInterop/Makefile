# This is a convenience Makefile for quickly running the TS files in this
# dir. It is not used by the test suite.
.PHONY: all
all:
	rm -f *.js
	tsc
	ls *.js | while read f; do echo "# node $$f"; node $$f; done
