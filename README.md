# PackSquash-action [![Latest version](https://img.shields.io/github/v/release/ComunidadAylas/PackSquash-action?label=Latest%20version)](https://github.com/ComunidadAylas/PackSquash-action/releases/latest) [![Uses PackSquash version](https://img.shields.io/badge/Uses%20PackSquash%20version-v0.3.1-red)](https://github.com/ComunidadAylas/PackSquash/releases/tag/v0.3.1)

Official action to run [PackSquash](https://github.com/ComunidadAylas/PackSquash), a Minecraft resource and data pack optimizer, in a GitHub Actions workflow, which allows it to better integrate in continuous integration processes.

## 📝 Usage

### Basic action parameters

These parameters are specific to the action, and the only ones you may need to set if you want to use the default PackSquash options.

| Parameter | Default value | Description |
|---|---|---|
| `path` | `.` (repository root) | Relative path from the repository root to the pack directory. |
| `token` | `${{ github.token }}` | The GitHub API authentication token that will be used for operations that may require authentication. Documentation about the default token is available [here](https://docs.github.com/en/actions/reference/authentication-in-a-workflow). By default, the [GitHub-generated `GITHUB_TOKEN` secret](https://docs.github.com/en/actions/reference/authentication-in-a-workflow#about-the-github_token-secret) is used, which is suitable for use in most scenarios, including private repositories. |

### Action parameters that set PackSquash options

The parameters in this section are used to automatically generate an [options file](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files) for PackSquash to use. You can modify them if you want to change what options PackSquash uses.

| Parameter | Default value | Description |
|---|---|---|
| [`recompress_compressed_files`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#recompress_compressed_files) | `false` | If `true`, this parameter makes PackSquash try to compress files whose contents are already compressed just before adding them to the generated ZIP file after all the file type-specific optimizations have been applied. |
| [`zip_compression_iterations`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#zip_compression_iterations) | `20` | The number of Zopfli compression iterations that PackSquash will do when compressing a file of magnitude 1 MiB just before it is added to the generated ZIP file. This affects files whose contents are not already compressed, or all files if recompress_compressed_files is enabled. |
| [`automatic_minecraft_quirks_detection`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#automatic_minecraft_quirks_detection) | `true` | Sets whether PackSquash will try to automatically deduce an appropriate set of Minecraft quirks that affect how pack files can be optimized, by looking at the pack files, or not. If this option is enabled (set to `true`), any other parameter for adding quirks will be ignored. Enabling this feature implies validating the pack metadata file, even if `validate_pack_metadata_file` is set to `false`. |
| [`work_around_grayscale_images_gamma_miscorrection_quirk`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks) | `false` | This parameter sets the whether a quirk with grayscale images will be worked around. You should only change the default value if needed. Please read [the relevant PackSquash documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks) for more details. |
| [`work_around_java8_zip_parsing_quirk`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks) | `false` | This parameter sets whether a quirk with how older Minecraft versions read ZIP files will be worked around, that may render them unable to read the ZIP files PackSquash generates when `zip_spec_conformance_level` is set to `disregard`. You should only change the default value of this parameter if needed. Please read [the relevant PackSquash documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks) for more details. |
| [`work_around_restrictive_banner_layer_texture_format_check_quirk`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks) | `false` | This parameter sets whether a quirk with how older Minecraft versions parse shield and banner textures in certain formats will be worked around. You should only change the default value if needed. Please read [the relevant PackSquash documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks) for more details. |
| [`work_around_bad_entity_eye_layer_texture_transparency_blending_quirk`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks) | `false` | This parameter sets whether a quirk with how Minecraft parses eye layer textures with transparent pixels will be worked around. You should only change the default value if needed. Please read [the relevant PackSquash documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks) for more details. |
| [`automatic_asset_types_mask_detection`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#automatic_asset_types_mask_detection) | `true` | If `true`, PackSquash will attempt to automatically deduce the appropriate set of pack files to include in the generated ZIP by checking what Minecraft versions it targets, according to the pack format version in the `pack.mcmeta` file. Otherwise, PackSquash will include any file it recognizes no matter what. Enabling this feature implies validating the pack metadata file, even if `validate_pack_metadata_file` is set to `false`. |
| [`allow_optifine_mod`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#allow_mods) | `false` | Adds support for .properties files. From PackSquash v0.3.0 onwards, it also adds .jpm and .jem for proper Custom Entity Models support. From PackSquash v0.3.1 onwards, the extensions .jpmc and .jemc are accepted to indicate the usage of comments. |
| [`allow_mtr3_mod`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#allow_mods) | `false` | Adds support for Blockbench modded entity model projects for custom train models in the mtr asset namespace, stored as .bbmodel or .bbmodelc files. |
| [`skip_pack_icon`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#skip_pack_icon) | `false` | If `true`, the pack.png file that contains the resource pack icon will not be included in the result ZIP file. As of Minecraft 1.16.3, the icon of server resource packs is not displayed, so this optimization does not have any drawbacks in this case. |
| [`validate_pack_metadata_file`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#validate_pack_metadata_file) | `true` | If `true`, the pack metadata file, `pack.mcmeta`, will be parsed and validated for errors. Otherwise, it will not be validated, unless other options imply doing so. Validating the pack metadata is usually a good thing because Minecraft requires it to load a pack. |
| [`ignore_system_and_hidden_files`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#ignore_system_and_hidden_files) | `true` | If `true`, PackSquash will skip and not print progress messages for system (i.e. clearly not for use with Minecraft) and hidden (i.e. whose name starts with a dot) files and folders. |
| [`zip_spec_conformance_level`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#zip_spec_conformance_level) | `high` | This parameter lets you choose the ZIP specification conformance level that is most suitable to your pack and situation. Please read [the relevant PackSquash documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#zip_spec_conformance_level) for more details. |
| [`size_increasing_zip_obfuscation`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#size_increasing_zip_obfuscation) | `false` | If `zip_spec_conformance_level` is set to `disregard`, enabling this parameter will add more protections against inspecting, extracting or tampering with the generated ZIP file that will slightly increase its size. |
| [`percentage_of_zip_structures_tuned_for_obfuscation_discretion`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#percentage_of_zip_structures_tuned_for_obfuscation_discretion) | `0` | If `zip_spec_conformance_level` is set to `disregard`, this parameter sets the approximate probability for each internal generated ZIP file structure to be stored in a way that favors additional discretion of the fact that protection techniques were used, as opposed to a way that favors increased compressibility of the result ZIP file. |
| [`never_store_squash_times`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#never_store_squash_times) | `false` | This parameter controls whether PackSquash will refuse to store the metadata needed to reuse previously generated ZIP files, and likewise not expect such data if the output ZIP file already exists, thus not reusing its contents to speed up the process in any way, no matter what the `zip_spec_conformance_level` is. |
| [`transcode_ogg`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#transcode_ogg) | `true` | When `true`, Ogg files will be reencoded again, to apply resampling, channel mixing, pitch shifting and bitrate reduction, which may degrade their quality, but commonly saves quite a bit of space. |
| [`audio_sampling_frequency`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#sampling_frequency) | `32000` | Specifies the sampling frequency (i.e. number of samples per second) to which the input audio files will be resampled, in Hertz (Hz). |
| [`target_audio_pitch`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#target_pitch) | `1.0` | Sets the in-game pitch shift coefficient that will result in the audio files being played back at the original speed, affecting the perceived pitch and tempo. |
| [`minimum_audio_bitrate`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#minimum_bitrate) | `40000` | Specifies the minimum bits per second (bps or bit/s) that the Ogg encoder will try to use to represent audio signals in audio files. |
| [`maximum_audio_bitrate`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#maximum_bitrate) | `96000` | Specifies the maximum bits per second (bps or bit/s) that the Ogg encoder will try to use to represent audio signals in audio files. |
| [`minify_json_files`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#minify_json) | `true` | When `true`, JSON files will be minified, which removes comments and unnecessary white space, to improve space savings. |
| [`delete_bloat_json_keys`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#delete_bloat_keys) | `true` | If this parameter is set to `true`, PackSquash will delete known-superfluous keys from JSON files, like credits added by pack authoring tools, that are completely ignored by Minecraft. |
| [`always_allow_json_comments`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#always_allow_json_comments) | `true` | If `true`, PackSquash will allow comments in JSON files whose usual extension does not end with an extra c letter, which explicitly marks the file as having an extended JSON format that may contain comments. If `false`, comments will only be allowed in JSON files with those specific extensions: .jsonc, .mcmetac, etc. |
| [`image_data_compression_iterations`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#image_data_compression_iterations) | `5` | Sets the number of Zopfli compression iterations that PackSquash will do to compress raw pixel data in image files that amounts to a magnitude of 1 MiB. |
| [`image_color_quantization_target`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#color_quantization_target) | `auto` | Sets the color quantization target for image files, which affects whether the lossy color quantization process is performed and how. |
| [`image_color_quantization_dithering_level`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#color_quantization_dithering_level) | `0.85` | Sets the level of dithering that will be applied when quantizing colors in image files. This option has no effect if `color_quantization_target` is not set to perform color quantization. |
| [`maximum_image_width_and_height`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#maximum_width_and_height) | `8192` | Sets the maximum width and height of the image files that PackSquash will accept without throwing an error. Please read [the relevant documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#maximum_width_and_height) for more details about the rationale of this option. |
| [`skip_image_alpha_optimizations`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#skip_alpha_optimizations) | `false` | If `true`, this parameter prevents the color values of completely transparent pixels in image files from being changed in order to achieve better compression. |
| [`minify_shaders`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#minify_shader) | `true` | When `true`, the source code of shaders will be minified, which removes comments and unnecessary white space, to improve space savings. |
| [`minify_legacy_language_files`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#minify_legacy_language) | `true` | If `true`, the legacy language files will be minified: empty lines and comments will be removed. This saves space and improves parsing performance. If `false`, those files will still be validated for errors but left as they are. |
| [`strip_legacy_language_files_bom`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#strip_legacy_language_bom) | `true` | If `true`, the BOM in the first line of legacy language files will be stripped. This usually saves space and avoids user confusion. When `false`, this behavior is disabled, which may be necessary if the pack relies on the BOM character to be present in any of these files. |
| [`minify_command_function_files`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#minify_command_function) | `true` | If `true`, the command function files will be minified: empty lines and comments will be removed. This saves space and improves parsing performance. If `false`, the files will still be validated for errors but left as they are. |
| [`minify_properties_files`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#minify_properties) | `true` | When `true`, and if the appropriate mod support is enabled, properties files will be minified, which removes comments and unnecessary white space, to improve space savings. |
| [`force_include_files`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#force_include) | `�` (empty string) | A list of file path glob patterns to always include in the generated ZIP file, even if PackSquash does not recognize such files as assets. These files are copied as-is, but not optimized in any specific way, so this option does not substitute proper PackSquash support for assets used by the game. Please read [the custom files feature documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#custom-files) for more details about this option. |

### Advanced action parameters

The action also supports additional parameters that might come in handy for more specific use cases. It shouldn't be necessary to set them for most circumstances, though.

| Parameter | Default value | Description |
|---|---|---|
| `packsquash_version` | `v0.3.1` | The PackSquash version the action will use. `latest` is a special keyword that refers to the latest unstable build, automatically generated by CI from the source code at the `master` branch in the PackSquash repository. Please note that too old or too new versions may be incompatible or not properly supported by the action. |
| `system_id` | Automatically generated | The system identifier PackSquash will use to generate cryptographic secrets. Unless you know what you are doing, it is recommended to leave this parameter unset, as doing so will let the action generate and use a suitable system identifier automatically. |
| `options_file` | Generated from the action parameters | Use the specified options file instead of generating one with this action. Use this if you already have an options file you want to use with this action or the options this action offers are not enough for your needs. Please note that the action relies on PackSquash generating an output file at `/var/lib/packsquash/pack.zip`, and it will use the options file you provide verbatim, overriding any other PackSquash option parameter you set. |
| `action_cache_revision` | `�` (empty string) | The revision of the cache the action uses internally. You should only need to change this revision if you want the action to not reuse any cached information, like the system identifier, or want to isolate jobs from each other due to undesired interferences between them. This will render any previously generated ZIP file unusable for speed optimizations unless you manage `system_id` yourself. |
| `artifact_name` | `Optimized pack` | The name of the workflow artifact containing the generated ZIP file that the action will upload. Later steps in the workflow will be able to download it by this name. Changing this may be needed in complex workflows, where the action runs several times. |
| `show_emoji_in_packsquash_logs` | `true` | If `true`, the action will instruct PackSquash to use emojis in the logs it generates, which look prettier. Otherwise, plain ASCII decoration characters will be used instead. |
| `enable_color_in_packsquash_logs` | `true` | If `true`, the action will instruct PackSquash to color the log messages it generates, which looks prettier. Otherwise, the messages will not be colored. |

## ⚙️ Examples

This section contains some example GitHub Actions workflow files to achieve common continuous integration tasks with this action.

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
        uses: ComunidadAylas/PackSquash-action@v2
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
        uses: ComunidadAylas/PackSquash-action@v2
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
        uses: ComunidadAylas/PackSquash-action@v2
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
        uses: ComunidadAylas/PackSquash-action@v2
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

⚠️ **Keep in mind that just uploading files to the web server might not be enough to make players download the new version the next time they connect**. The Minecraft server should be configured with the appropriate resource pack ZIP file URL and hash each time the pack is updated. Otherwise, clients will receive stale information and may decide to use the copy they have downloaded already. This example omits that part on purpose because the precise way of doing it (running plugin commands via RCON, modifying the `server.properties` file and restarting the server, etc.) is environment-specific.

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

## 🔒 Security

This action may store in a cache the encryption key needed to read file modification times from the ZIP files PackSquash generates. Therefore, such encryption key can be exposed to anyone that has access to the repository. However, this is not a concern in practical scenarios, because the file modification times are generated from the commit history, so having access to the repository already provides this information. If for some reason you do not want this behavior, you can set `never_store_squash_times` to `true`, although that will likely slow down PackSquash. For more information about the implications of caching potentially-sensitive data, please read the [GitHub documentation](https://docs.github.com/en/actions/guides/caching-dependencies-to-speed-up-workflows#about-caching-workflow-dependencies).

## ✉️ Contact and support

Please check out the [PackSquash](https://github.com/ComunidadAylas/PackSquash) repository for contact information.

## ⭐ Authorship and governance highlights

The original author of this action is [@sya-ri](https://github.com/sya-ri). Later, it was incubated as an open source project by the same team behind PackSquash.
