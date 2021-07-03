# PackSquash-action [![Latest version](https://img.shields.io/github/v/release/ComunidadAylas/PackSquash-action?label=Latest%20version)](https://github.com/ComunidadAylas/PackSquash-action/releases/latest) [![Works with PackSquash version](https://img.shields.io/badge/Uses%20PackSquash%20version-v0.2.1-red)](https://github.com/ComunidadAylas/PackSquash/releases/tag/v0.2.1)

Official action to run [PackSquash](https://github.com/ComunidadAylas/PackSquash), a Minecraft resource pack optimizer, in a GitHub Actions workflow, which allows it to better integrate in continuous integration processes.

## 📝 Usage

### Action parameters

| Parameter | Default value | Description |
|---|---|---|
| path | **required** | Relative path to the resource pack directory. |
| [skip_pack_icon](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#skip_pack_icon) | `false` | If true, the pack.png file that contains the resource pack icon will not be included in the result ZIP file. As of Minecraft 1.16.3, the icon of server resource packs is not displayed, so this optimization does not have any drawbacks in this case. |
| [strict_zip_spec_compliance](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#strict_zip_spec_compliance) | `true` | If false, PackSquash will generate ZIP files that, while readable as normal by the current Minecraft resource pack ZIP file parser and not outright forbidden by the ZIP specification, are rather unconventional and may be rejected by some programs. |
| [compress_already_compressed_files](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#compress_already_compressed_files) | `false` | If true, PackSquash will try to recompress files that are already compressed by design when adding them to the result ZIP file. |
| [ignore_system_and_hidden_files](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#ignore_system_and_hidden_files) | `true` | If true, PackSquash will skip and not print progress messages for system (i.e. clearly not for use with Minecraft) and hidden (i.e. whose name starts with a dot) files and folders. |
| [allow_optifine_mod](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#allowed_mods) | `false` | Adds support for .properties files. From version 0.3.0 onwards, it also adds .jpm and .jem for proper Custom Entity Models support. |
| [sampling_frequency](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#sampling_frequency) | `32000` | Specifies the sampling frequency (i.e. number of samples per second) to which the input audio file will be resampled, in Hertz (Hz). |
| [target_pitch](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#target_pitch) | `1.0` | Sets the in-game pitch shift coefficient that will result in the audio being played back at the original speed, affecting the perceived pitch and tempo. |
| [minimum_bitrate](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#minimum_bitrate) | `40000` | Specifies the minimum bits per second (bps or bit/s) that the OGG encoder will try to use to represent the audio signal. |
| [maximum_bitrate](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#maximum_bitrate) | `96000` | Specifies the maximum bits per second (bps or bit/s) that the OGG encoder will try to use to represent the audio signal. |
| [quantize_image](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format#quantize_image) | `true` | When true, libimagequant will perform palette quantization on PNG images to reduce the number of different colors to a maximum of 256, in order to save space. |
| output_path | `resource_pack.zip` | File path where the generated ZIP with the resource pack will be stored. |

### ‼️ Advanced: using an already existing PackSquash settings file

The action automatically generates a PackSquash settings file for you using the parameters described above. However, if for some reason you want to use one you already have in the repository, you can do so by changing the `settings_file` parameter to the relative path where your settings file is. When you use a settings file the rest of parameters will be ignored (i.e. the action won't edit your settings file). Please check out the [PackSquash documentation](https://github.com/ComunidadAylas/PackSquash/wiki/Settings-file-format) for more details about this file.


## ⚙️ Example

This GitHub Actions workflow file uses this action to optimize the resource pack contained in the `pack` directory of the repository (if your pack is at the root of the repository, you may change that path to `.`). It runs for every push to the repository, so a ZIP file with the optimized resource pack will be generated for any change. The generated optimized resource pack file is uploaded as an artifact, where it can be downloaded.

##### `.github/workflows/packsquash.yml`
```yaml
name: Optimize resouce pack
on: [push]
jobs:
  packsquash:
    name: Optimize resource pack
    runs-on: ubuntu-latest
    steps:
      - name: Clone Repository
        uses: actions/checkout@master
        with:
          fetch-depth: 1
      - name: Run PackSquash
        uses: ComunidadAylas/PackSquash-action@v1
        with:
          path: pack
      - name: Upload optimized pack
        uses: actions/upload-artifact@v2
        with:
          name: Optimized resource pack
          path: resource_pack.zip
```

## ✉️ Contact and support

Please check out the [PackSquash](https://github.com/ComunidadAylas/PackSquash) repository for contact information.

## ⭐ Authorship and governance highlights

The original author of this action is [@sya-ri](https://github.com/sya-ri). Later, it was incubated as an open source project by the same team behind PackSquash.
