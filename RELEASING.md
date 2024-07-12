# How to release the ecs-logging-nodejs packages in this repo

There are two types of packages in this repo:

1. The `@elastic/ecs-helpers` utility package that is used by the others, and
2. the `@elastic/ecs-[...]-format` packages for supported logging frameworks
   that are meant to be used by end users.

The ecs-helpers utility is versioned, released, and tagged independently from
the others.

## Releasing `@elastic/ecs-helpers`

Assuming "x.y.z" is the release version:

1. Choose the appropriate version number according to semver.
2. Create a PR that:
    - bumps the "version" in "packages/ecs-helpers/package.json",
    - updates "packages/ecs-helpers/CHANGELOG.md", if necessary, and
    - is named something like "release @elastic/ecs-helpers@x.y.z", if the PR
      is only about doing the release. (If this PR is also related to other
      changes, then the commit/PR title should include mention of those
      things as well.)
3. Get the PR approved and merged.
4. Tag the commit as follows, in a git clone with the merged commit:
    ```
    git tag ecs-helpers-vx.y.z
    git push origin ecs-helpers-vx.y.z
    ```

5. The automation will do the rest.

If for any reason you need to run the publish the package manually then run the
below command in a clean git clone:
    ```
    git status              # this should show "working tree clean"

    cd packages/ecs-helpers
    npm publish
    ```


## Releasing `@elastic/ecs-[...]-format`

1. Choose the appropriate version number. All `ecs-*-format` packages currently
   coordinate their versions. That means that if "1.2.3" is the current latest
   release of any those packages, then the next release version of any of
   them is after that. Use `git tag -l` to list current versions.

   For example, if the latest versions are ecs-winston-format@1.2.3 and
   ecs-morgan-format@1.1.0, and a new release only for ecs-morgan-format
   is being done, then the next version should be:
    - `1.2.4` for a patch-level release,
    - `1.3.0` for a minor-level release, or
    - `2.0.0` for a major-level release

   This is a bit weird for some cases, but allows use to have a simple `vx.y.z`
   tag for referring to the source code for any published release.

2. Create a PR that:
    - bumps the "version" in "packages/ecs-[...]-format/package.json",
    - updates "packages/ecs-[...]-format/CHANGELOG.md", if necessary, and
    - is named something like "release vx.y.z" if all format packages are
      being released or "release @elastic/ecs-morgan-format@x.y.z" if just
      one of them is being released.
   (If this PR is also related to other changes, then the commit/PR title
   should include mention of those things as well.)

3. Get the PR approved and merged.

4. Tag the commit as follows, in a git clone with the merged commit:
    ```
    git tag vx.y.z
    git push origin vx.y.z
    ```

5. The automation will do the rest.

If for any reason you need to run the publish the package manually then run the
below command in a clean git clone:
    ```
    git status              # this should show "working tree clean"

    # for each of the packages being released:
    cd packages/ecs-...-format
    npm publish
    ```
