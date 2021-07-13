#!/bin/sh

# options variables
SETTING_FILE=${1}
DIRECTORY_PATH=${2}
SKIP_PACK_ICON=${3}
STRICT_ZIP_SPEC_COMPLIANCE=${4}
COMPRESS_ALREADY_COMPRESSED_FILES=${5}
if [ -n "$COMPRESS_ALREADY_COMPRESSED_FILES" ]; then
    echo '::warning ::compress_already_compressed_files: Deprecated. Please rename to recompress_compressed_files.'
    RECOMPRESS_COMPRESSED_FILES=COMPRESS_ALREADY_COMPRESSED_FILES
else
    RECOMPRESS_COMPRESSED_FILES=${6}
fi
IGNORE_SYSTEM_AND_HIDDEN_FILES=${7}
ALLOW_MOD_OPTIFINE=${8}
ALLOW_MODS="["
if [ "$ALLOW_MOD_OPTIFINE" = "true" ]; then
    ALLOW_MODS="$ALLOW_MODS'OptiFine'"
fi
ALLOW_MODS="$ALLOW_MODS]"
SAMPLING_FREQUENCY=${9}
TARGET_PITCH=${10}
MINIMUM_BITRATE=${11}
MAXIMUM_BITRATE=${12}
QUANTIZE_IMAGE=${13}
OUTPUT=${14}

# print version
printf 'PackSquash version: ' && packsquash --version

# change to GitHub WorkSpace Directory
cd "$GITHUB_WORKSPACE" || exit 1

if [ -z "$SETTING_FILE" ]; then
  # generate settings
  echo "
pack_directory = '$DIRECTORY_PATH'
skip_pack_icon = $SKIP_PACK_ICON
strict_zip_spec_compliance = $STRICT_ZIP_SPEC_COMPLIANCE
recompress_compressed_files = $RECOMPRESS_COMPRESSED_FILES
ignore_system_and_hidden_files = $IGNORE_SYSTEM_AND_HIDDEN_FILES
allow_mods = $ALLOW_MODS
output_file_path = '$OUTPUT'

['**/*.{og[ga],mp3,wav,flac}']
sampling_frequency = $SAMPLING_FREQUENCY
minimum_bitrate = $MINIMUM_BITRATE
maximum_bitrate = $MAXIMUM_BITRATE
target_pitch = $TARGET_PITCH

['**/*.png']
quantize_image = $QUANTIZE_IMAGE
" > packsquash-settings.toml

  SETTING_FILE=packsquash-settings.toml
fi

echo 'Will use these settings:' && nl -b a $SETTING_FILE

# optimize
packsquash packsquash-settings.toml
