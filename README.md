<div align="center">
<h1>PackSquash-action</h1>

<a href="#"><img alt="Latest version" src="https://img.shields.io/github/v/release/ComunidadAylas/PackSquash-action?label=Latest%20version"></a>
<a href="https://github.com/ComunidadAylas/PackSquash-action/actions/workflows/build.yml"><img alt="CI status" src="https://github.com/ComunidadAylas/PackSquash-action/actions/workflows/build.yml/badge.svg"></a>

Action to run [PackSquash](https://github.com/ComunidadAylas/PackSquash), a
Minecraft resource and data pack optimizer, in a GitHub Actions workflow, which
allows it to better integrate in continuous integration processes.
</div>

## ⚙️ Usage examples

This section contains some example GitHub Actions workflow files that leverage
this action to achieve typical continuous integration tasks.

The action accepts many input parameters under the `with` key. Most are
optional, but you might want to set them to customize the behavior of the
action. These examples cover only the most salient parameters, so head over to
the [input parameters](#-input-parameters) section if you want to know more
about them.

### Optimize each commit to an artifact

This workflow will execute PackSquash for each push to the repository,
generating an
[artifact](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)
with the optimized pack for each change. The workflow expects the pack to be in
the repository root. The generated artifact can be downloaded by users with read
access to the repository [via the GitHub web UI or
CLI](https://docs.github.com/en/actions/managing-workflow-runs/downloading-workflow-artifacts).
It can also be downloaded in other steps or workflows using the
[`actions/download-artifact`](https://github.com/marketplace/actions/download-a-build-artifact)
action.

#### File tree

```
Repository root
├── .github
│   └── workflows
│       └── packsquash.yml
├── assets
│   └── ...
└── pack.mcmeta
```

#### Workflow file: `.github/workflows/packsquash.yml`

```yaml
name: Optimize resource pack
on: [push]
jobs:
  packsquash:
    name: Optimize resource pack
    runs-on: ubuntu-latest
    steps:
      - name: Clone repository
        uses: actions/checkout@v3
        with:
          fetch-depth: 0 # A non-shallow repository clone is required
      - name: Run PackSquash
        uses: ComunidadAylas/PackSquash-action@v4
        with:
          packsquash_version: latest # Uses the latest PackSquash release supported by the action
```

### Optimize each commit to an artifact, but changing the pack directory

In some cases, the directory where the pack is located is not the same as
repository root. You can specify a directory other than the repository root by
changing the `options` input parameter, which can be a path to a TOML file or an
inline TOML string containing the options to pass to the PackSquash command-line
application. These options follow the same format as the options files used by
the PackSquash application, which are documented
[here](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files).

Changing the pack directory is handy for repositories that contain multiple
packs, or for isolating the pack from the rest of the repository to prevent
miscellaneous files from being considered as pack files by PackSquash.

#### File tree

```
Repository root
├── .github
│   └── workflows
│       └── packsquash.yml
└── pack
    ├── assets
    │   └── ...
    └── pack.mcmeta
```

#### Workflow file: `.github/workflows/packsquash.yml`

```yaml
name: Optimize resource pack
on: [push]
jobs:
  packsquash:
    name: Optimize resource pack
    runs-on: ubuntu-latest
    steps:
      - name: Clone repository
        uses: actions/checkout@v3
        with:
          fetch-depth: 0 # A non-shallow repository clone is required
      - name: Run PackSquash
        uses: ComunidadAylas/PackSquash-action@v4
        with:
          # When changing the options passed to PackSquash, it may be a good idea to lock
          # your workflow to a specific PackSquash version instead of "latest". This will
          # prevent sudden failures when releases that introduce incompatible changes to
          # the options file format are made, but will require you to manually update
          # the PackSquash version your workflows use when a release occurs
          packsquash_version: latest
          options: |
            pack_directory = 'pack'
```

### Optimize to an artifact and create a release

The previous examples can easily be expanded to create releases automatically by
downloading the generated artifact and uploading it again as a release.

#### Workflow file (every push): `.github/workflows/packsquash.yml`

This workflow creates a new tag and release named `action-v{number}` for every
push event, which is triggered by commits and other tags.

```yaml
name: Optimize resource pack
on: [push]
jobs:
  packsquash:
    name: Optimize resource pack
    runs-on: ubuntu-latest
    steps:
      - name: Clone repository
        uses: actions/checkout@v3
        with:
          fetch-depth: 0 # A non-shallow repository clone is required
      - name: Run PackSquash
        uses: ComunidadAylas/PackSquash-action@v4
        with:
          packsquash_version: latest
          options: |
            # Optimize the pack in the root repository directory.
            # This is the default value for pack_directory when no PackSquash options are defined
            pack_directory = '.'

            # Set a custom output file path to work with the generated ZIP file
            # without needing to download its artifact in a separate step
            output_file_path = '/tmp/pack.zip'
      - name: Tag and create release
        uses: softprops/action-gh-release@v1
        with:
          tag_name: action-v${{ github.run_number }}
          files: /tmp/pack.zip
```

#### Workflow file (every tag push): `.github/workflows/packsquash.yml`

This workflow creates a new release whenever a tag is pushed. The release will
have the same name as the tag.

```yaml
name: Optimize resource pack
on:
  push:
    tags:
      - '**'
jobs:
  packsquash:
    name: Optimize resource pack
    runs-on: ubuntu-latest
    steps:
      - name: Clone repository
        uses: actions/checkout@v3
        with:
          fetch-depth: 0 # A non-shallow repository clone is required
      - name: Run PackSquash
        uses: ComunidadAylas/PackSquash-action@v4
        with:
          packsquash_version: latest
          options: |
            pack_directory = '.'
            output_file_path = '/tmp/pack.zip'
      - name: Create release
        uses: softprops/action-gh-release@v1
        with:
          files: /tmp/pack.zip
```

### Advanced: automatic release deployment via SSH

When developing in private repositories it is not possible for vanilla Minecraft
clients to download resource packs from release artifacts, as they lack the
required authentication credentials. A common solution is to upload releases to
an external web server directly from a GitHub Actions workflow via SSH.

> **Warning**: **keep in mind that just uploading files to the web server might
> not be enough to make players download the new version the next time they
> connect**. The Minecraft server should be configured with the appropriate
> resource pack ZIP file URL and hash each time the pack is updated. Otherwise,
> clients will receive stale information and may decide to use the copy they
> have downloaded already. This example omits that part on purpose because the
> precise way of doing it (running plugin commands via RCON, modifying the
> `server.properties` file and restarting the server, etc.) is
> environment-specific.

#### Secrets

This example workflow uses the following
[secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets),
which can be set in the repository settings.

| Name | Description |
|---|---|
| `SSH_HOST` | Web (and/or SSH) server host name or address |
| `SSH_USERNAME` | Username for SSH authentication |
| `SSH_PRIVATE_KEY` | Private key for SSH authentication |
| `SSH_PORT` | SSH server listen port |
| `DEPLOY_DIRECTORY` | Directory where the pack will be deployed to. Usually `/var/www/` for the web server root |

#### Workflow file: `.github/workflows/deploy.yml`

```yaml
name: Deploy via SSH
on: [workflow_dispatch]
jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    steps:
      - name: Download latest released pack
        uses: dsaltares/fetch-gh-release-asset@v1.0.0
        with:
          file: pack.zip
          target: pack.zip
      - name: Rename pack file
        # An unique name guarantees an unique URL. Different URLs
        # compel Minecraft clients to download packs again, but
        # make sure to read and understand the warning above before
        # doing this in production!
        run: mv pack.zip pack-${{ github.run_number }}.zip
      - name: Deploy pack file
        uses: appleboy/scp-action@v0.1.2
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.SSH_PORT }}
          source: pack-${{ github.run_number }}.zip
          target: ${{ secrets.DEPLOY_DIRECTORY }}
```

## 📄 Template repositories

Some users are creating [template
repositories](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template)
with this action, making it very easy to get up and running with the development
of your very own pack. We have curated a list of handy repository templates
below, but feel free to send pull requests to add new reusable templates here!

- [`osfanbuff63/minecraft-datapack`](https://github.com/osfanbuff63/minecraft-datapack):
  a template repository for vanilla Minecraft data packs that uses PackSquash to
  bundle them in optimized ZIP files. Each commit is optimized to a ZIP
  artifact. No releases or deployments are made.
- [`sya-ri/MinecraftResourcePackTemplate`](https://github.com/sya-ri/MinecraftResourcePackTemplate)
  (in Japanese; uses outdated versions of PackSquash and this action): a
  template repository for Minecraft resource packs that uses PackSquash to
  bundle them in optimized ZIP files. Each commit is optimized to a ZIP
  artifact, and a release is made when a new tag is pushed.

## 📝 Input parameters

The input parameters accepted by the action are documented below.

### Basic parameters

These parameters enable essential tuning of the options passed to PackSquash and
the behavior of the action.

#### `packsquash_version`

**Default value**

None (**required**)

**Description**

The PackSquash version that the action will use. Please note that too old or too
new versions may be incompatible or fully supported by the action. There are
four types of versions that can be specified:

- **`vXXX`**, where `XXX` is a PackSquash release version, such as `0.4.0` or
  `0.3.1`.
- **`latest`**, which refers to the latest PackSquash release version. This
  version will change over time as new PackSquash releases are published.
  Different PackSquash version may use distinct options, so if you use custom
  options it may be necessary to change them when new PackSquash releases come
  out.
- **`latest-unstable`**, which refers to the latest unstable PackSquash build,
  automatically generated by CI from the source code on the `master` branch in
  the PackSquash repository. As with `latest`, please note that this version
  varies over time.
- **The full SHA hash of a commit on the `master` branch of the PackSquash
  repository**. This references the unstable build generated by CI for the
  specified source code commit. Please bear in mind that GitHub retains unstable
  build artifacts for a limited time, so too old commits may no longer have
  their associated build available.

#### `options`

**Default value**

`pack_directory = "."`

**Description**

The options to pass to PackSquash, either as a file path or as a TOML string.
Relative paths are interpreted from the repository root. If not specified,
PackSquash will optimize a pack in the repository root with the default options.

#### `token`

**Default value**

`${{ github.token }}`

**Description**

The GitHub API authentication token that will be used for operations that may
require authentication. Documentation about the default token is available
[here](https://docs.github.com/en/actions/reference/authentication-in-a-workflow).
By default, the [GitHub-generated `GITHUB_TOKEN`
secret](https://docs.github.com/en/actions/reference/authentication-in-a-workflow#about-the-github_token-secret)
is used, which is suitable for use in most scenarios, including private
repositories.

#### `artifact_name`

**Default value**

`Optimized pack`

**Description**

The name of the workflow artifact containing the generated ZIP file that the
action will upload. Later steps in the workflow will be able to download it by
this name. Changing this may be needed in complex workflows, where the action
runs several times.

#### `show_emoji_in_packsquash_logs`

**Default value**

`true`

**Description**

If `true`, the action will instruct PackSquash to use emojis in the logs it
generates, which look prettier. Otherwise, plain ASCII decoration characters
will be used instead.

#### `enable_color_in_packsquash_logs`

**Default value**

`true`

**Description**

If `true`, the action will instruct PackSquash to color the log messages it
generates, which looks prettier. Otherwise, the messages will not be colored.

### Advanced action parameters

This action also supports additional parameters that might be useful for more
specific use cases. It shouldn't be necessary to set them for most
circumstances, though.

#### `system_id`

**Default value**

Automatically generated

**Description**

The system identifier PackSquash will use to generate cryptographic secrets.
Unless you know what you are doing, it is recommended to leave this parameter
unset, as doing so will let the action generate and use a suitable system
identifier automatically.

#### `action_cache_revision`

**Default value**

`​` (empty string)

**Description**

The revision of the cache the action uses internally. You should only need to
change this revision if you want the action to not reuse any cached information,
like the system identifier, or want to isolate jobs from each other due to
undesired interferences between them. This will render any previously generated
ZIP file unusable for speed optimizations unless you manage `system_id`
yourself.

## 🔒 Security

This action may store in a cache the encryption key needed to read file
modification times from the ZIP files PackSquash generates. Therefore, such
encryption key can be exposed to anyone that has access to the repository.
However, this is not a concern in practical scenarios, because the file
modification times are generated from the commit history, so having access to
the repository already provides this information. If for some reason you do not
want this behavior, you can set `never_store_squash_times` to `true`, although
that will likely slow down PackSquash. For more information about the
implications of caching potentially-sensitive data, please read the [GitHub
documentation](https://docs.github.com/en/actions/guides/caching-dependencies-to-speed-up-workflows#about-caching-workflow-dependencies).

## ✉️ Contact and support

Please check out the [PackSquash](https://github.com/ComunidadAylas/PackSquash)
repository for contact information.

## 🧑‍🤝‍🧑 Contributors

Thanks goes to these wonderful people ([emoji
key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sya-ri"><img src="https://avatars.githubusercontent.com/u/34268371?v=4?s=100" width="100px;" alt="sya-ri"/><br /><sub><b>sya-ri</b></sub></a><br /><a href="https://github.com/ComunidadAylas/PackSquash-action/issues?q=author%3Asya-ri" title="Bug reports">🐛</a> <a href="https://github.com/ComunidadAylas/PackSquash-action/commits?author=sya-ri" title="Code">💻</a> <a href="#content-sya-ri" title="Content">🖋</a> <a href="#data-sya-ri" title="Data">🔣</a> <a href="https://github.com/ComunidadAylas/PackSquash-action/commits?author=sya-ri" title="Documentation">📖</a> <a href="#example-sya-ri" title="Examples">💡</a> <a href="#ideas-sya-ri" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-sya-ri" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#question-sya-ri" title="Answering Questions">💬</a> <a href="#research-sya-ri" title="Research">🔬</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/AlexTMjugador"><img src="https://avatars.githubusercontent.com/u/7822554?v=4?s=100" width="100px;" alt="Alejandro González"/><br /><sub><b>Alejandro González</b></sub></a><br /><a href="https://github.com/ComunidadAylas/PackSquash-action/commits?author=AlexTMjugador" title="Code">💻</a> <a href="#content-AlexTMjugador" title="Content">🖋</a> <a href="https://github.com/ComunidadAylas/PackSquash-action/commits?author=AlexTMjugador" title="Documentation">📖</a> <a href="#ideas-AlexTMjugador" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-AlexTMjugador" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-AlexTMjugador" title="Maintenance">🚧</a> <a href="#question-AlexTMjugador" title="Answering Questions">💬</a> <a href="#research-AlexTMjugador" title="Research">🔬</a> <a href="https://github.com/ComunidadAylas/PackSquash-action/pulls?q=is%3Apr+reviewed-by%3AAlexTMjugador" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/xMikux"><img src="https://avatars.githubusercontent.com/u/26039249?v=4?s=100" width="100px;" alt="Miku"/><br /><sub><b>Miku</b></sub></a><br /><a href="https://github.com/ComunidadAylas/PackSquash-action/issues?q=author%3AxMikux" title="Bug reports">🐛</a> <a href="#ideas-xMikux" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://osfanbuff63.github.io/"><img src="https://avatars.githubusercontent.com/u/91388253?v=4?s=100" width="100px;" alt="osfanbuff63"/><br /><sub><b>osfanbuff63</b></sub></a><br /><a href="#ideas-osfanbuff63" title="Ideas, Planning, & Feedback">🤔</a> <a href="#example-osfanbuff63" title="Examples">💡</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://alumina6767.net/"><img src="https://avatars.githubusercontent.com/u/85728971?v=4?s=100" width="100px;" alt="alumina6767"/><br /><sub><b>alumina6767</b></sub></a><br /><a href="#blog-alumina6767" title="Blogposts">📝</a> <a href="#ideas-alumina6767" title="Ideas, Planning, & Feedback">🤔</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the
[all-contributors](https://github.com/all-contributors/all-contributors)
specification. Contributions of any kind welcome!
