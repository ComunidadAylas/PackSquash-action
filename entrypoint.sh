#!/bin/sh

# if exit code is non-zero, exit sh
set -e

# options variables
if [ -n "$INPUT_STRICT_ZIP_SPEC_COMPLIANCE" ]; then
    echo '::error ::strict_zip_spec_compliance: Removed in v0.3.0. Delete this option.'
fi
if [ -n "$INPUT_COMPRESS_ALREADY_COMPRESSED_FILES" ]; then
    echo '::warning ::compress_already_compressed_files: Deprecated. Please rename to recompress_compressed_files.'
    INPUT_RECOMPRESS_COMPRESSED_FILES=INPUT_COMPRESS_ALREADY_COMPRESSED_FILES
fi
ALLOW_MODS="["
if [ "$INPUT_ALLOW_OPTIFINE_MOD" = "true" ]; then
    ALLOW_MODS="$ALLOW_MODS'OptiFine'"
fi
ALLOW_MODS="$ALLOW_MODS]"
if [ -n "$INPUT_QUANTIZE_IMAGE" ]; then
    echo '::error ::quantize_image: Removed in v0.3.0. Delete this option.'
fi

case "$INPUT_VERSION" in
  'latest' )
    if [ -z $GITHUB_TOKEN ]; then
      echo '::error::Environment variable GITHUB_TOKEN is not set.'
      exit 1
    else
      curl -sSL https://api.github.com/repos/ComunidadAylas/PackSquash/actions/artifacts \
       | jq ".artifacts | sort_by(.created_at) | reverse" \
       | jq "map(select(.name == \"PackSquash executable (Linux, x64, glibc)\"))" \
       | jq -r ".[0] | .url" \
       | (echo `cat`/'zip') \
       | wget --header="Authorization: token $GITHUB_TOKEN" -qi -
       unzip -o zip
       rm zip
    fi
  ;;
  'v0.1.0' | 'v0.1.1' | 'v0.1.2' | 'v0.2.0' | 'v0.2.1' )
    if [ -z $INPUT_SETTINGS_FILE ]; then
      echo '::error::Not using settings_file in older versions is not supported.'
      exit 1
    else
      curl -sSL "https://api.github.com/repos/ComunidadAylas/PackSquash/releases/tags/$INPUT_VERSION" \
       | grep "browser_download_url.*PackSquash.executable.Linux.zip\"" \
       | cut -d : -f 2,3 \
       | tr -d \" \
       | wget -qi -
      unzip -o PackSquash.executable.Linux.zip
      rm PackSquash.executable.Linux.zip
    fi
  ;;
  * ) # v0.3.0-rc.1
    curl -sSL "https://api.github.com/repos/ComunidadAylas/PackSquash/releases/tags/$INPUT_VERSION" \
     | grep "browser_download_url.*PackSquash.executable.Linux.x64.glibc.zip\"" \
     | cut -d : -f 2,3 \
     | tr -d \" \
     | wget -qi -
    unzip -o PackSquash.executable.Linux.x64.glibc.zip
    rm PackSquash.executable.Linux.x64.glibc.zip
  ;;
esac

chmod a+x packsquash

# print version
echo "::group::PackSquash version:"
./packsquash --version
echo "::endgroup::"

# change to GitHub WorkSpace Directory
cd "$GITHUB_WORKSPACE" || exit 1

PACKSQUASH_SYSTEM_ID="$INPUT_SYSTEM_ID"

# check cache directory exists
if [ -d $INPUT_CACHE_PATH ]; then
  if [ -z "$PACKSQUASH_SYSTEM_ID" ]; then
    # get system id
    PACKSQUASH_SYSTEM_ID=`cat "$INPUT_CACHE_PATH/system_id"`
  fi

  # restore last optimized pack
  cp "$INPUT_CACHE_PATH/cache_pack.zip" "$INPUT_OUTPUT_PATH"
else
  mkdir "$INPUT_CACHE_PATH"

  if [ -z "$PACKSQUASH_SYSTEM_ID" ]; then
    # generate system id
    PACKSQUASH_SYSTEM_ID=`cat /proc/sys/kernel/random/uuid`
    echo "$PACKSQUASH_SYSTEM_ID" > "$INPUT_CACHE_PATH/system_id"
  fi
fi

export PACKSQUASH_SYSTEM_ID

if [ -z "$INPUT_SETTINGS_FILE" ]; then
  # generate settings
  echo "
pack_directory = '$INPUT_PATH'
skip_pack_icon = $INPUT_SKIP_PACK_ICON
recompress_compressed_files = $INPUT_RECOMPRESS_COMPRESSED_FILES
zip_compression_iterations = $INPUT_ZIP_COMPRESSION_ITERATIONS
work_around_minecraft_quirks = $INPUT_WORK_AROUND_MINECRAFT_QUIRKS
ignore_system_and_hidden_files = $INPUT_IGNORE_SYSTEM_AND_HIDDEN_FILES
allow_mods = $ALLOW_MODS
zip_spec_conformance_level = '$INPUT_ZIP_SPEC_CONFORMANCE_LEVEL'
size_increasing_zip_obfuscation = $INPUT_SIZE_INCREASING_ZIP_OBFUSCATION
percentage_of_zip_structures_tuned_for_obfuscation_discretion = $INPUT_PERCENTAGE_OF_ZIP_STRUCTURES_TUNED_FOR_OBFUSCATION_DISCRETION
never_store_squash_times = $INPUT_NEVER_STORE_SQUASH_TIMES
output_file_path = '$INPUT_OUTPUT_PATH'

['**/*?.ogg']
transcode_ogg = $INPUT_TRANSCODE_OGG

['**/*.{og[ga],mp3,wav,flac}']
sampling_frequency = $INPUT_SAMPLING_FREQUENCY
minimum_bitrate = $INPUT_MINIMUM_BITRATE
maximum_bitrate = $INPUT_MAXIMUM_BITRATE
target_pitch = $INPUT_TARGET_PITCH

['**/*.{json,jsonc}']
minify_json = $INPUT_MINIFY_JSON
delete_bloat_keys = $INPUT_DELETE_BLOAT_KEYS

['**/*.png']
color_quantization_target = '$INPUT_COLOR_QUANTIZATION_TARGET'
maximum_width_and_height = $INPUT_MAXIMUM_WIDTH_AND_HEIGHT

['**/*.{fsh,vsh}']
minify_shader = $INPUT_MINIFY_SHADER

['**/*.properties']
minify_properties = $INPUT_MINIFY_PROPERTIES

" > packsquash-settings.toml

  INPUT_SETTINGS_FILE=packsquash-settings.toml
fi

echo '::group::Will use these settings:'
nl -b a $INPUT_SETTINGS_FILE
echo "::endgroup::"

if [ "$INPUT_PRINT_SYSTEM_ID" = "true" ]; then
  echo '::group::Will use system id:'
  echo "$PACKSQUASH_SYSTEM_ID"
  echo "::endgroup::"
fi

# apply timestamp from git
/git-set-file-times.sh

# optimize
./packsquash packsquash-settings.toml

# save optimized pack
cp "$INPUT_OUTPUT_PATH" "$INPUT_CACHE_PATH/cache_pack.zip"
