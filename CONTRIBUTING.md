# ❤️ Contributing Guidelines

This project shares its contributing guidelines with the main PackSquash
project. Such guidelines are available
[here](https://github.com/ComunidadAylas/PackSquash/blob/master/CONTRIBUTING.md).

# 💻 Technologies and development environment

This action is a relatively straightforward facade for downloading, setting up,
and running the PackSquash command-line interface on a repository checkout. It
is developed in TypeScript, a stronger-typed superset of JavaScript, targeting a
Node.js 24 environment. Dependency and build management are automated with
[npm](https://www.npmjs.com/). The transpilation to a single-file JavaScript
bundle is done automatically by a workflow on push, but it can also be done
manually by running `npm build`. Node.js actions are the most lightweight and
performant type of custom actions available on GitHub.

For a hands-on guide on custom JavaScript GitHub actions, check out [the
official
documentation](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action).

Make sure that any code changes you make follow the style of already existing
code, and are formatted as if `npm format` was run on the project.
