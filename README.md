# PackSquash-action [![Latest version](https://img.shields.io/github/v/release/ComunidadAylas/PackSquash-action?label=Latest%20version)](https://github.com/ComunidadAylas/PackSquash-action/releases/latest) [![Works with PackSquash version](https://img.shields.io/badge/Uses%20PackSquash%20version-latest-red)](https://github.com/ComunidadAylas/PackSquash/releases/tag/v0.3.0-rc.1)

Official action to run [PackSquash](https://github.com/ComunidadAylas/PackSquash), a Minecraft resource pack optimizer, in a GitHub Actions workflow, which allows it to better integrate in continuous integration processes.

## 📝 Usage

### Basic action parameters

These parameters are specific to the action, and the only ones you may need to set if you want to use the default PackSquash options.

| Parameter | Default value | Description |
|---|---|---|
| `path` | `.` (repository root) | Relative path from the repository root to the pack directory. |
| `github_token` | `${{ github.token }}` | The GitHub API authentication token that will be used for operations that may require authentication. Documentation about the default token is available [here](https://docs.github.com/en/actions/reference/authentication-in-a-workflow). |

### Action parameters that set PackSquash options

The parameters in this section are used to automatically generate an [options file](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files) for PackSquash to use. You can modify them if you want to change what options PackSquash uses.

| Parameter | Default value | Description |
|---|---|---|
| [`recompress_compressed_files`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#recompress_compressed_files) | `false` | If `true`, this parameter makes PackSquash try to compress files whose contents are already compressed just before adding them to the generated ZIP file, after all the file type specific optimizations have been applied. |
| [`zip_compression_iterations`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#zip_compression_iterations) | `20` | The number of Zopfli compression iterations that PackSquash will do when compressing a file of magnitude 1 MiB just before it is added to the generated ZIP file. This affects files whose contents are not already compressed, or all files if recompress_compressed_files is enabled. |
| [`automatic_minecraft_quirks_detection`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#automatic_minecraft_quirks_detection) | `true` | Sets whether PackSquash will try to automatically deduce an appropriate set of Minecraft quirks that affect how pack files can be optimized, by looking at the pack files, or not. If this option is enabled (set to `true`), any other parameter for adding quirks will be ignored. |
| [`work_around_grayscale_images_gamma_miscorrection_quirk`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks) | `false` | This parameter sets the whether a quirk with grayscale images will be worked around. You should only change the default value if needed. Please read [the relevant PackSquash documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks) for more details. |
| [`work_around_java8_zip_parsing_quirk`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks) | `false` | This parameter sets whether a quirk with how older Minecraft versions read ZIP files will be worked around, that may render them unable to read the ZIP files PackSquash generates when `zip_spec_conformance_level` is set to `disregard`. You should only change the default value of this parameter if needed. Please read [the relevant PackSquash documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#work_around_minecraft_quirks) for more details. |
| [`allow_optifine_mod`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#allow_mods) | `false` | Adds support for .properties files. From version 0.3.0 onwards, it also adds .jpm and .jem for proper Custom Entity Models support. |
| [`skip_pack_icon`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#skip_pack_icon) | `false` | If `true`, the pack.png file that contains the resource pack icon will not be included in the result ZIP file. As of Minecraft 1.16.3, the icon of server resource packs is not displayed, so this optimization does not have any drawbacks in this case. |
| [`validate_pack_metadata_file`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#validate_pack_metadata_file) | `true` | If `true`, the pack metadata file, pack.mcmeta, will be parsed and validated for errors. Otherwise, it will not be validated. Validating the pack metadata is usually a good thing, because Minecraft requires it to load a pack. |
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
| [`image_data_compression_iterations`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#image_data_compression_iterations) | `3` | Sets the number of Zopfli compression iterations that PackSquash will do to compress raw pixel data in image files that amounts to a magnitude of 1 MiB. |
| [`image_color_quantization_target`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#color_quantization_target) | `eight_bit_depth` | Sets the color quantization target for image files, which affects whether the lossy color quantization process is performed and how. |
| [`maximum_image_width_and_height`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#maximum_width_and_height) | `8192` | Sets the maximum width and height of the image files that PackSquash will accept without throwing an error. Please read [the relevant documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#maximum_width_and_height) for more details about the rationale of this option. |
| [`skip_image_alpha_optimizations`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#skip_alpha_optimizations) | `false` | If `true`, this parameter prevents the color values of completely transparent pixels in image files from being changed in order to achieve better compression. |
| [`minify_shaders`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#minify_shader) | `true` | When `true`, the source code of shaders will be minified, which removes comments and unnecessary white space, to improve space savings. |
| [`minify_properties_files`](https://github.com/ComunidadAylas/PackSquash/wiki/Options-files#minify_properties) | `true` | When `true`, and if the appropriate mod support is enabled, properties files will be minified, which removes comments and unnecessary white space, to improve space savings. |


### Advanced action parameters

The action also supports additional parameters that might come in handy for more specific use cases. It shouldn't be necessary to set them for most circumstances, though.

| Parameter | Default value | Description |
|---|---|---|
| `packsquash_version` | `latest` (will be changed to `v0.3.0` when both the action and PackSquash get a new release) | The PackSquash version the action will use. Please note that too old or too new versions may be incompatible or not properly supported by the action. |
| `system_id` | Automatically generated | The system identifier PackSquash will use to generate cryptographic secrets. Unless you know what are you doing, it is recommended to leave this parameter unset, as doing so will let the action generate and use a suitable system identifier automatically. |
| `options_file` | Generated from the action parameters | Use the specified options file instead of generating one with this action. Use this if you already have an options file you want to use with this action, or the options this action offers are not enough for your needs. Please note that the action relies on PackSquash generating an output file at `/var/lib/packsquash/pack.zip`, and it will use the options file you provide verbatim, overriding any other PackSquash option parameter you set. |
| `action_cache_revision` | `﻿` (empty string) | The revision of the cache the action uses internally. You should only need to bump this revision if for some reason you want the action to not reuse any cached information, like the system identifier. This will render any previously generated ZIP file unusable for speed optimizations. |

## ⚙️ Example

This GitHub Actions workflow file uses this action to optimize the resource pack contained in the `pack` directory of the repository (if your pack is at the root of the repository, you may change that path to `.`). It runs for every push to the repository, so a ZIP file with the optimized resource pack will be generated for any change. `github_token` is set to the [GitHub-generated `GITHUB_TOKEN` secret](https://docs.github.com/en/actions/reference/authentication-in-a-workflow#about-the-github_token-secret), which is suitable to use in most scenarios, including with private repositories. The generated optimized resource pack file is uploaded as an artifact that can be downloaded later.

##### `.github/workflows/packsquash.yml`
```yaml
name: Optimize resource pack
on: [push]
jobs:
  packsquash:
    name: Optimize resource pack
    runs-on: ubuntu-latest
    steps:
      - name: Clone repository
        uses: actions/checkout@v2
        with:
          fetch-depth: 0 # A non-shallow repository clone is required
      - name: Run PackSquash
        uses: ComunidadAylas/PackSquash-action@master
        with:
          path: pack
```

## 🔒 Security

This action may store in a cache the encryption key needed to read file modification times from the ZIP files PackSquash generates. Therefore, such encryption key can be exposed to anyone that has access to the repository. However, this is not a concern in practical scenarios, because the file modification times are generated from the commit history, so having access to the repository already provides this information. If for some reason you do not want this behavior, you can set `never_store_squash_times` to `true`, although that will likely slow down PackSquash. For more information about the implications of caching potentially-sensitive data, please read the [GitHub documentation](https://docs.github.com/en/actions/guides/caching-dependencies-to-speed-up-workflows#about-caching-workflow-dependencies).

## ✉️ Contact and support

Please check out the [PackSquash](https://github.com/ComunidadAylas/PackSquash) repository for contact information.

## ⭐ Authorship and governance highlights

The original author of this action is [@sya-ri](https://github.com/sya-ri). Later, it was incubated as an open source project by the same team behind PackSquash.
