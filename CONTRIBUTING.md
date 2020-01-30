# Contributing to the ecs-logging-js libraries

The ecs-logging-js libraries are open source and we love to receive contributions
from our community — you!

There are many ways to contribute,
from writing tutorials or blog posts,
improving the documentation,
submitting bug reports and feature requests or writing code.

## Repository structure

This repository contains multiple packages, that you can find inside the `loggers/*`
folder and inside the `helper` folder.  
Every package has its own `package.json` and `node_modules` folder, same for test
and documentation.  
You can run the test of a specific package by going inside its directory and run `npm test`, or you can run all the test by using the script present in `.ci/run_test.sh`.
You can also install all the dependencies with `.ci/run_install.sh`.

## Code contributions

If you have a bugfix or new feature that you would like to contribute,
please find or open an issue about it first.
Talk about what you would like to do.
It may be that somebody is already working on it,
or that there are particular issues that you should know about before implementing the change.

### Submitting your changes

Generally, we require that you test any code you are adding or modifying.
Once your changes are ready to submit for review:

1. Test your changes

    Run the test suite to make sure that nothing is broken.
    You can either run the test of a single package with `npm test`
    or run the script in `.ci/run_test.sh`, which will run the test for all the packages.

2. Submit a pull request

    Push your local changes to your forked copy of the repository and [submit a pull request](https://help.github.com/articles/using-pull-requests).
    In the pull request,
    choose a title which sums up the changes that you have made,
    and in the body provide more details about what your changes do.
    Also mention the number of the issue where discussion has taken place,
    eg "Closes #123".

3. Sign the Contributor License Agreement

    Please make sure you have signed our [Contributor License Agreement](https://www.elastic.co/contributor-agreement/).
    We are not asking you to assign copyright to us,
    but to give us the right to distribute your code without restriction.
    We ask this of all contributors in order to assure our users of the origin and continuing existence of the code.
    You only need to sign the CLA once.

4. Be patient

    We might not be able to review your code as fast as we would like to,
    but we'll do our best to dedicate it the attention it deserves.
    Your effort is much appreciated!

### Releasing

If you have access to make releases, the process is as follows:

1. Update the version in `package.json` according to the scale of the change. (major, minor or patch)
1. Commit changes with message `Bumped vx.y.z` where `x.y.z` is the version in `package.json`
1. Update the corresponding CHANGELOG.md`
1. Wait for CI to finish running the test.
1. Publish to npm with `npm publish` *(see [publish](https://docs.npmjs.com/cli/publish) and [dist-tag](https://docs.npmjs.com/cli/dist-tag) docs)*
