<div align="center">
<h1>PackSquash-action</h1>

<a href="#"><img alt="Latest version" src="https://img.shields.io/github/v/release/ComunidadAylas/PackSquash-action?label=Latest%20version"></a>
<a href="https://github.com/ComunidadAylas/PackSquash/releases/tag/v0.3.1"><img alt="Uses PackSquash version" src="https://img.shields.io/badge/Uses%20PackSquash%20version-v0.3.1-red"></a>

Action to run [PackSquash](https://github.com/ComunidadAylas/PackSquash), a Minecraft resource and data pack optimizer, in a GitHub Actions workflow, which allows it to better integrate in continuous integration processes.
</div>

## ⚙️ Usage examples

This section contains some example GitHub Actions workflow files that leverage this action to achieve typical continuous integration tasks.

The action accepts many input parameters under the `with` key. They are optional, but you might need to set them to tailor the action operation to your needs. These examples only cover the most salient parameters, so head over to the [input parameters](#-input-parameters) section if you want to know more about them.

### Optimize each commit to an artifact

This workflow will execute PackSquash for every push to the repository, generating an [artifact](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts) with the optimized pack for any change. The workflow expects the pack to be at the repository root. The generated artifact can be downloaded by users with read access to the repository [via the GitHub web UI or CLI](https://docs.github.com/en/actions/managing-workflow-runs/downloading-workflow-artifacts). It can also be downloaded in other steps or workflows via the [`actions/download-artifact`](https://github.com/marketplace/actions/download-a-build-artifact) or [`dawidd6/action-download-artifact`](https://github.com/marketplace/actions/download-workflow-artifact) actions.

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
        uses: ComunidadAylas/PackSquash-action@v3
```

### Optimize each commit to an artifact, but changing the pack directory

In some cases, the directory where the pack is does not match the repository root. You can specify a directory other than the repository root by changing the `path` input parameter.

This is useful for repositories that contain several packs (monorepos) and isolating the pack from the rest of the repository, preventing miscellaneous repository files from being considered as pack files by PackSquash.

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
        uses: ComunidadAylas/PackSquash-action@v3
        with:
          path: pack
```

### Optimize to an artifact and create a release

The previous examples can easily be expanded to create releases automatically by downloading the generated artifact and uploading it again as a release.

#### Workflow file (every push): `.github/workflows/packsquash.yml`

This workflow creates a new tag and release named `action-v{number}` for every push event, which is triggered by commits and other tags.

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
        uses: ComunidadAylas/PackSquash-action@v3
      - name: Download optimized pack
        uses: actions/download-artifact@v3
        with:
          name: Optimized pack
      - name: Tag and create release
        uses: softprops/action-gh-release@v1
        with:
          tag_name: action-v${{ github.run_number }}
          files: pack.zip
```

#### Workflow file (every tag push): `.github/workflows/packsquash.yml`

This workflow creates a new release whenever a tag is pushed. The release will have the same name as the tag.

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
        uses: ComunidadAylas/PackSquash-action@v3
      - name: Download optimized pack
        uses: actions/download-artifact@v3
        with:
          name: Optimized pack
      - name: Create release
        uses: softprops/action-gh-release@v1
        with:
          files: pack.zip
```

### Advanced: automatic release deployment via SSH

When developing in private repositories it is not possible for vanilla Minecraft clients to download resource packs from release artifacts, as they lack the required authentication credentials. A common solution is to upload releases to an external web server directly from a GitHub Actions workflow via SSH.

> **Warning**: **keep in mind that just uploading files to the web server might not be enough to make players download the new version the next time they connect**. The Minecraft server should be configured with the appropriate resource pack ZIP file URL and hash each time the pack is updated. Otherwise, clients will receive stale information and may decide to use the copy they have downloaded already. This example omits that part on purpose because the precise way of doing it (running plugin commands via RCON, modifying the `server.properties` file and restarting the server, etc.) is environment-specific.

#### Secrets 

This example workflow uses the following [secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets), which can be set in the repository settings.

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

Some users are creating [template repositories](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template) with this action, making it very easy to get up and running with the development of your very own pack. We have curated a list of handy repository templates below, but feel free to send pull requests to add new reusable templates here!

- [`sya-ri/MinecraftResourcePackTemplate`](https://github.com/sya-ri/MinecraftResourcePackTemplate) (in Japanese): a template repository for Minecraft resource packs that uses PackSquash to bundle them in optimized ZIP files. Each commit is optimized to a ZIP artifact, and a release is made when a new tag is pushed.
- [`osfanbuff63/minecraft-datapack`](https://github.com/osfanbuff63/minecraft-datapack): a template repository for vanilla Minecraft data packs that uses PackSquash to bundle them in optimized ZIP files. Each commit is optimized to a ZIP artifact. No releases or deployments are made.

## 📝 Input parameters

The input parameters accepted by the action are documented below.

### Basic parameters

These parameters are action-specific, and do not change the options passed to PackSquash that may influence how packs are processed.

#### `path`

**Default value**

`.` (repository root)

**Description**

Relative path from the repository root to the directory of the pack that will be processed by the action.

#### `token`

**Default value**

`${{ github.token }}`

**Description**

The GitHub API authentication token that will be used for operations that may require authentication. Documentation about the default token is available [here](https://docs.github.com/en/actions/reference/authentication-in-a-workflow). By default, the [GitHub-generated `GITHUB_TOKEN` secret](https://docs.github.com/en/actions/reference/authentication-in-a-workflow#about-the-github_token-secret) is used, which is suitable for use in most scenarios, including private repositories.

#### `artifact_name`

**Default value**

`Optimized pack`

**Description**

The name of the workflow artifact containing the generated ZIP file that the action will upload. Later steps in the workflow will be able to download it by this name. Changing this may be needed in complex workflows, where the action runs several times.

#### `show_emoji_in_packsquash_logs`

**Default value**

`true`

**Description**

If `true`, the action will instruct PackSquash to use emojis in the logs it generates, which look prettier. Otherwise, plain ASCII decoration characters will be used instead.

#### `enable_color_in_packsquash_logs`

**Default value**

`true`

**Description**

If `true`, the action will instruct PackSquash to color the log messages it generates, which looks prettier. Otherwise, the messages will not be colored.

### Setting PackSquash options

There are two mutually exclusive ways to set PackSquash options (i.e., change the [options file](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files) that is passed to PackSquash) in this action:

- **Let the action generate an options file**, which can be customized via input parameters that mirror the available PackSquash options. This is the easiest way to get started and saves the hassle of maintaining an options file. However, it does not support non-default PackSquash versions (see the [`packsquash_version`](#packsquash_version) parameter), neither setting file-specific options only for subsets of files.
- **Use a preexisting options file** by setting the `options_file` parameter to its path. This provides more flexibility at the cost of potentially more complexity. Please note that, as the action relies on PackSquash generating an output file at a fixed location, it will ignore the value of the `output_file_path` option and it should be removed from the options file. When `options_file` is set, the action will ignore the value of every input parameter used to generate an options file.

The following list shows all the available input parameters that can be set to customize action-generated options files.

#### [`recompress_compressed_files`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#recompress_compressed_files)

**Default value**

`false`

**Description**

If `true`, this parameter makes PackSquash try to compress files whose contents are already compressed just before adding them to the generated ZIP file after all the file type-specific optimizations have been applied.

#### [`zip_compression_iterations`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#zip_compression_iterations)

**Default value**

`20`

**Description**

The number of Zopfli compression iterations that PackSquash will do when compressing a file of magnitude 1 MiB just before it is added to the generated ZIP file. This affects files whose contents are not already compressed, or all files if recompress_compressed_files is enabled.

#### [`automatic_minecraft_quirks_detection`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#automatic_minecraft_quirks_detection)

**Default value**

`true`

**Description**

Sets whether PackSquash will try to automatically deduce an appropriate set of Minecraft quirks that affect how pack files can be optimized, by looking at the pack files, or not. If this option is enabled (set to `true`), any other parameter for adding quirks will be ignored. Enabling this feature implies validating the pack metadata file, even if `validate_pack_metadata_file` is set to `false`.

#### [`work_around_grayscale_images_gamma_miscorrection_quirk`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks)

**Default value**

`false`

**Description**

This parameter sets the whether a quirk with grayscale images will be worked around. You should only change the default value if needed. Please read [the relevant PackSquash documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks) for more details.

#### [`work_around_java8_zip_parsing_quirk`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks)

**Default value**

`false`

**Description**

This parameter sets whether a quirk with how older Minecraft versions read ZIP files will be worked around, that may render them unable to read the ZIP files PackSquash generates when `zip_spec_conformance_level` is set to `disregard`. You should only change the default value of this parameter if needed. Please read [the relevant PackSquash documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks) for more details.

#### [`work_around_restrictive_banner_layer_texture_format_check_quirk`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks)

**Default value**

`false`

**Description**

This parameter sets whether a quirk with how older Minecraft versions parse shield and banner textures in certain formats will be worked around. You should only change the default value if needed. Please read [the relevant PackSquash documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks) for more details.

#### [`work_around_bad_entity_eye_layer_texture_transparency_blending_quirk`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks)

**Default value**

`false`

**Description**

This parameter sets whether a quirk with how Minecraft parses eye layer textures with transparent pixels will be worked around. You should only change the default value if needed. Please read [the relevant PackSquash documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks) for more details.

#### [`automatic_asset_types_mask_detection`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#automatic_asset_types_mask_detection)

**Default value**

`true`

**Description**

If `true`, PackSquash will attempt to automatically deduce the appropriate set of pack files to include in the generated ZIP by checking what Minecraft versions it targets, according to the pack format version in the `pack.mcmeta` file. Otherwise, PackSquash will include any file it recognizes no matter what. Enabling this feature implies validating the pack metadata file, even if `validate_pack_metadata_file` is set to `false`.

#### [`allow_optifine_mod`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#allow_mods)

**Default value**

`false`

**Description**

Adds support for .properties files. From PackSquash v0.3.0 onwards, it also adds .jpm and .jem for proper Custom Entity Models support. From PackSquash v0.3.1 onwards, the extensions .jpmc and .jemc are accepted to indicate the usage of comments.

#### [`allow_mtr3_mod`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#allow_mods)

**Default value**

`false`

**Description**

Adds support for Blockbench modded entity model projects for custom train models in the mtr asset namespace, stored as .bbmodel or .bbmodelc files.

#### [`skip_pack_icon`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#skip_pack_icon)

**Default value**

`false`

**Description**

If `true`, the pack.png file that contains the resource pack icon will not be included in the result ZIP file. As of Minecraft 1.16.3, the icon of server resource packs is not displayed, so this optimization does not have any drawbacks in this case.

#### [`validate_pack_metadata_file`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#validate_pack_metadata_file)

**Default value**

`true`

**Description**

If `true`, the pack metadata file, `pack.mcmeta`, will be parsed and validated for errors. Otherwise, it will not be validated, unless other options imply doing so. Validating the pack metadata is usually a good thing because Minecraft requires it to load a pack.

#### [`ignore_system_and_hidden_files`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#ignore_system_and_hidden_files)

**Default value**

`true`

**Description**

If `true`, PackSquash will skip and not print progress messages for system (i.e. clearly not for use with Minecraft) and hidden (i.e. whose name starts with a dot) files and folders.

#### [`zip_spec_conformance_level`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#zip_spec_conformance_level)

**Default value**

`high`

**Description**

This parameter lets you choose the ZIP specification conformance level that is most suitable to your pack and situation. Please read [the relevant PackSquash documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#zip_spec_conformance_level) for more details.

#### [`size_increasing_zip_obfuscation`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#size_increasing_zip_obfuscation)

**Default value**

`false`

**Description**

If `zip_spec_conformance_level` is set to `disregard`, enabling this parameter will add more protections against inspecting, extracting or tampering with the generated ZIP file that will slightly increase its size.

#### [`percentage_of_zip_structures_tuned_for_obfuscation_discretion`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#percentage_of_zip_structures_tuned_for_obfuscation_discretion)

**Default value**

`0`

**Description**

If `zip_spec_conformance_level` is set to `disregard`, this parameter sets the approximate probability for each internal generated ZIP file structure to be stored in a way that favors additional discretion of the fact that protection techniques were used, as opposed to a way that favors increased compressibility of the result ZIP file.

#### [`never_store_squash_times`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#never_store_squash_times)

**Default value**

`false`

**Description**

This parameter controls whether PackSquash will refuse to store the metadata needed to reuse previously generated ZIP files, and likewise not expect such data if the output ZIP file already exists, thus not reusing its contents to speed up the process in any way, no matter what the `zip_spec_conformance_level` is.

#### [`transcode_ogg`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#transcode_ogg)

**Default value**

`true`

**Description**

When `true`, Ogg files will be reencoded again, to apply resampling, channel mixing, pitch shifting and bitrate reduction, which may degrade their quality, but commonly saves quite a bit of space.

#### [`audio_sampling_frequency`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#sampling_frequency)

**Default value**

`32000`

**Description**

Specifies the sampling frequency (i.e. number of samples per second) to which the input audio files will be resampled, in Hertz (Hz).

#### [`target_audio_pitch`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#target_pitch)

**Default value**

`1.0`

**Description**

Sets the in-game pitch shift coefficient that will result in the audio files being played back at the original speed, affecting the perceived pitch and tempo.

#### [`minimum_audio_bitrate`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#minimum_bitrate)

**Default value**

`40000`

**Description**

Specifies the minimum bits per second (bps or bit/s) that the Ogg encoder will try to use to represent audio signals in audio files.

#### [`maximum_audio_bitrate`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#maximum_bitrate)

**Default value**

`96000`

**Description**

Specifies the maximum bits per second (bps or bit/s) that the Ogg encoder will try to use to represent audio signals in audio files.

#### [`minify_json_files`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#minify_json)

**Default value**

`true`

**Description**

When `true`, JSON files will be minified, which removes comments and unnecessary white space, to improve space savings.

#### [`delete_bloat_json_keys`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#delete_bloat_keys)

**Default value**

`true`

**Description**

If this parameter is set to `true`, PackSquash will delete known-superfluous keys from JSON files, like credits added by pack authoring tools, that are completely ignored by Minecraft.

#### [`always_allow_json_comments`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#always_allow_json_comments)

**Default value**

`true`

**Description**

If `true`, PackSquash will allow comments in JSON files whose usual extension does not end with an extra c letter, which explicitly marks the file as having an extended JSON format that may contain comments. If `false`, comments will only be allowed in JSON files with those specific extensions: .jsonc, .mcmetac, etc.

#### [`image_data_compression_iterations`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#image_data_compression_iterations)

**Default value**

`5`

**Description**

Sets the number of Zopfli compression iterations that PackSquash will do to compress raw pixel data in image files that amounts to a magnitude of 1 MiB.

#### [`image_color_quantization_target`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#color_quantization_target)

**Default value**

`auto`

**Description**

Sets the color quantization target for image files, which affects whether the lossy color quantization process is performed and how.

#### [`image_color_quantization_dithering_level`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#color_quantization_dithering_level)

**Default value**

`0.85`

**Description**

Sets the level of dithering that will be applied when quantizing colors in image files. This option has no effect if `color_quantization_target` is not set to perform color quantization.

#### [`maximum_image_width_and_height`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#maximum_width_and_height)

**Default value**

`8192`

**Description**

Sets the maximum width and height of the image files that PackSquash will accept without throwing an error. Please read [the relevant documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#maximum_width_and_height) for more details about the rationale of this option.

#### [`skip_image_alpha_optimizations`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#skip_alpha_optimizations)

**Default value**

`false`

**Description**

If `true`, this parameter prevents the color values of completely transparent pixels in image files from being changed in order to achieve better compression.

#### [`minify_shaders`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#minify_shader)

**Default value**

`true`

**Description**

When `true`, the source code of shaders will be minified, which removes comments and unnecessary white space, to improve space savings.

#### [`minify_legacy_language_files`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#minify_legacy_language)

**Default value**

`true`

**Description**

If `true`, the legacy language files will be minified: empty lines and comments will be removed. This saves space and improves parsing performance. If `false`, those files will still be validated for errors but left as they are.

#### [`strip_legacy_language_files_bom`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#strip_legacy_language_bom)

**Default value**

`true`

**Description**

If `true`, the BOM in the first line of legacy language files will be stripped. This usually saves space and avoids user confusion. When `false`, this behavior is disabled, which may be necessary if the pack relies on the BOM character to be present in any of these files.

#### [`minify_command_function_files`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#minify_command_function)

**Default value**

`true`

**Description**

If `true`, the command function files will be minified: empty lines and comments will be removed. This saves space and improves parsing performance. If `false`, the files will still be validated for errors but left as they are.

#### [`minify_properties_files`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#minify_properties)

**Default value**

`true`

**Description**

When `true`, and if the appropriate mod support is enabled, properties files will be minified, which removes comments and unnecessary white space, to improve space savings.

#### [`force_include_files`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#force_include)

**Default value**

`​` (empty string)

**Description**

A list of file path glob patterns to always include in the generated ZIP file, even if PackSquash does not recognize such files as assets. These files are copied as-is, but not optimized in any specific way, so this option does not substitute proper PackSquash support for assets used by the game. Please read [the custom files feature documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#custom-files) for more details about this option.

### Advanced action parameters

This action also supports additional parameters that might be useful for more specific use cases. It shouldn't be necessary to set them for most circumstances, though.

#### `packsquash_version`

**Default value**

`v0.3.1`

**Description**

The PackSquash version the action will use. `latest` is a special keyword that refers to the latest unstable build, automatically generated by CI from the source code at the `master` branch in the PackSquash repository. Please note that too old or too new versions may be incompatible or not properly supported by the action.

#### `system_id`

**Default value**

Automatically generated

**Description**

The system identifier PackSquash will use to generate cryptographic secrets. Unless you know what you are doing, it is recommended to leave this parameter unset, as doing so will let the action generate and use a suitable system identifier automatically.

#### `action_cache_revision`

**Default value**

`​` (empty string)

**Description**

The revision of the cache the action uses internally. You should only need to change this revision if you want the action to not reuse any cached information, like the system identifier, or want to isolate jobs from each other due to undesired interferences between them. This will render any previously generated ZIP file unusable for speed optimizations unless you manage `system_id` yourself.

## 🔒 Security

This action may store in a cache the encryption key needed to read file modification times from the ZIP files PackSquash generates. Therefore, such encryption key can be exposed to anyone that has access to the repository. However, this is not a concern in practical scenarios, because the file modification times are generated from the commit history, so having access to the repository already provides this information. If for some reason you do not want this behavior, you can set `never_store_squash_times` to `true`, although that will likely slow down PackSquash. For more information about the implications of caching potentially-sensitive data, please read the [GitHub documentation](https://docs.github.com/en/actions/guides/caching-dependencies-to-speed-up-workflows#about-caching-workflow-dependencies).

## ✉️ Contact and support

Please check out the [PackSquash](https://github.com/ComunidadAylas/PackSquash) repository for contact information.

## 🧑‍🤝‍🧑 Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

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

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
