#!/bin/sh

# options variable
SETTING_FILE=${1}
DIRECTORY_PATH=${2}
SKIP_PACK_ICON=${3}
STRICT_ZIP_SPEC_COMPLIANCE=${4}
COMPRESS_ALREADY_COMPRESSED_FILES=${5}
IGNORE_SYSTEM_AND_HIDDEN_FILES=${6}
ALLOW_MOD_OPTIFINE=${7}
ALLOW_MODS="["
if [ $ALLOW_MOD_OPTIFINE = "true" ]; then
    ALLOW_MODS=$ALLOW_MODS"\"OptiFine\""
fi
ALLOW_MODS=$ALLOW_MODS"]"
SAMPLING_FREQUENCY=${8}
TARGET_PITCH=${9}
MINIMUM_BITRATE=${10}
MAXIMUM_BITRATE=${11}
QUANTIZE_IMAGE=${12}
OUTPUT=${13}

# print version
packsquash --version

# change to GitHub WorkSpace Directory
cd "$GITHUB_WORKSPACE"

if [ -z $SETTING_FILE ]; then
  # generate settings
  echo '
resource_pack_directory = "'$DIRECTORY_PATH'"
skip_pack_icon = '$SKIP_PACK_ICON'
strict_zip_spec_compliance = '$STRICT_ZIP_SPEC_COMPLIANCE'
compress_already_compressed_files = '$COMPRESS_ALREADY_COMPRESSED_FILES'
ignore_system_and_hidden_files = '$IGNORE_SYSTEM_AND_HIDDEN_FILES'
allowed_mods = '$ALLOW_MODS'
output_file_path = "'$OUTPUT'"

["assets/*/sounds/{music,ambience}/?*.{og[ga],mp3,wav,flac}"]
sampling_frequency = '$SAMPLING_FREQUENCY'
minimum_bitrate = '$MINIMUM_BITRATE'
maximum_bitrate = '$MAXIMUM_BITRATE'

["**/*.png"]
quantize_image = '$QUANTIZE_IMAGE'
' > packsquash-settings.toml

  SETTING_FILE=packsquash-settings.toml
fi

cat $SETTING_FILE

# optimize
packsquash packsquash-settings.toml