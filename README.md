# PackSquash-action

[![Latest version](https://img.shields.io/github/v/release/ComunidadAylas/PackSquash-action?label=Latest%20version)](https://github.com/ComunidadAylas/PackSquash-action/releases/latest)
[![PackSquash version](https://img.shields.io/badge/PackSquash%20version-v0.2.1-blue)](https://github.com/ComunidadAylas/PackSquash/releases/tag/v0.2.1)

Official action to run PackSquash in a GitHub Actions workflow.

> A Minecraft resource pack optimizer which aims to achieve the best possible compression, which allows for efficient distribution and slightly improved load times in the game, at good speed. Anecdotal evidence shows that, with the default options, it is able to reduce the size of the Witchcraft & Wizardary resource pack ZIP file by Floo Network (version 1.6.2) from 118 MiB to 57 MiB, a 51.69% size reduction.
> 
> [ComunidadAylas/PackSquash](https://github.com/ComunidadAylas/PackSquash)

## `[Recommend]` Use Workflows Option

### Inputs

| Option | Default | Description |
|---|---|---|
| path | **required** | Relative path to the texture pack directory. |
| [skip_pack_icon](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#skip_pack_icon) | `false` | If true, the pack.png file that contains the resource pack icon will not be included in the result ZIP file. As of Minecraft 1.16.3, the icon of server resource packs is not displayed, so this optimization does not have any drawbacks in this case. |
| [strict_zip_spec_compliance](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#strict_zip_spec_compliance) | `true` | If false, PackSquash will generate ZIP files that, while readable as normal by the current Minecraft resource pack ZIP file parser and not outright forbidden by the ZIP specification, are rather unconventional and may be rejected by some programs. |
| [compress_already_compressed_files](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#compress_already_compressed_files) | `false` | If true, PackSquash will try to recompress files that are already compressed by design when adding them to the result ZIP file. |
| [ignore_system_and_hidden_files](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#ignore_system_and_hidden_files) | `true` | If true, PackSquash will skip and not print progress messages for system (i.e. clearly not for use with Minecraft) and hidden (i.e. whose name starts with a dot) files and folders. |
| [allow_mod_optifine](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#allowed_mods) | `false` | Adds .properties files. From version 0.3.0 onwards, it also adds .jpm and .jem for proper Custom Entity Models support. |
| [sampling_frequency](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#sampling_frequency) | `32000` | Specifies the sampling frequency (i.e. number of samples per second) to which the input audio file will be resampled, in Hertz (Hz). |
| [target_pitch](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#target_pitch) | `1.0` | Sets the in-game pitch shift coefficient that will result in the audio being played back at the original speed, affecting the perceived pitch and tempo. |
| [minimum_bitrate](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#minimum_bitrate) | `40000` | Specifies the minimum bits per second (bps or bit/s) that the OGG encoder will try to use to represent the audio signal. |
| [maximum_bitrate](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#maximum_bitrate) | `96000` | Specifies the maximum bits per second (bps or bit/s) that the OGG encoder will try to use to represent the audio signal. |
| [quantize_image](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#quantize_image) | `true` | When true, libimagequant will perform palette quantization on PNG images to reduce the number of different colors to a maximum of 256, in order to save space. |
| output | `optimize-texture` | Optimized texture pack filename. |

### Example Usage
※ The resource pack directory is `texture`.

Pushing to the repository will be able to download the optimized file from the GitHub Actions artifacts.

##### .github/workflows/packsquash.yml
```yaml
name: Optimize ResoucePack
on: [push]
jobs:
  packsquash:
    name: Optimize
    runs-on: ubuntu-latest
    steps:
      - name: Clone Repository
        uses: actions/checkout@master
        with:
          fetch-depth: 1
      - name: Run PackSquash
        uses: ComunidadAylas/PackSquash-action@v1
        with:
          path: texture
      - name: Output Optimized
        uses: actions/upload-artifact@v2
        with:
          name: optimize-texture
          path: optimize-texture
```

## `[Advanced]` Use Setting File

### Inputs

| Option | Default | Description |
|---|---|---|
| setting_file | **required** | Relative path to PackSquash config file. Please read [here](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format). |
