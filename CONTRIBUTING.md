# Contributing to the ecs-logging-nodejs libraries

The ecs-logging-nodejs libraries are open source and all contributions
(issues, comments, pull requests) are welcome.


## Developing for this repository

This repository contains multiple packages, in the "packages/" directory. It
is using [npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
to manage multiple packages. The common tasks are:

    npm --workspaces install
    npm --workspaces test
    npm --workspaces lint
    npm --workspaces lint:fix

Using npm workspaces requires npm@7 or later, which typically means Node.js
v16 or later. However, these packages currently support back to Node.js v10.
For earlier versions of Node.js, you can install and test using:

    make all
    make test


## Pull requests

Generally, we require that you test any code you are adding or modifying.
Once your changes are ready to submit for review:

1. Test your changes:

        npm --workspaces test

2. Submit a pull request

    Push your local changes to your forked copy of the repository and [submit a pull request](https://help.github.com/articles/using-pull-requests).

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

1. Update the version in `package.json` according to the scale of the change
   (major, minor or patch).
1. Update the corresponding "CHANGELOG.md".
1. Commit changes with message `Bumped vx.y.z` where `x.y.z` is the version in
   "package.json".
1. Wait for CI to finish running the test.
1. Publish to npm with `npm publish` *(see
   [publish](https://docs.npmjs.com/cli/publish) and
   [dist-tag](https://docs.npmjs.com/cli/dist-tag) docs)*
