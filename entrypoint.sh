#!/bin/sh

# options variables
SETTING_FILE=${1}
DIRECTORY_PATH=${2}
SKIP_PACK_ICON=${3}
STRICT_ZIP_SPEC_COMPLIANCE=${4}
if [ -n "$STRICT_ZIP_SPEC_COMPLIANCE" ]; then
    echo '::error ::strict_zip_spec_compliance: Removed in v0.3.0. Delete this option.'
fi
COMPRESS_ALREADY_COMPRESSED_FILES=${5}
if [ -n "$COMPRESS_ALREADY_COMPRESSED_FILES" ]; then
    echo '::warning ::compress_already_compressed_files: Deprecated. Please rename to recompress_compressed_files.'
    RECOMPRESS_COMPRESSED_FILES=COMPRESS_ALREADY_COMPRESSED_FILES
else
    RECOMPRESS_COMPRESSED_FILES=${6}
fi
ZIP_COMPRESSION_ITERATIONS=${7}
WORK_AROUND_MINECRAFT_QUIRKS=${8}
IGNORE_SYSTEM_AND_HIDDEN_FILES=${9}
ALLOW_MOD_OPTIFINE=${10}
ALLOW_MODS="["
if [ "$ALLOW_MOD_OPTIFINE" = "true" ]; then
    ALLOW_MODS="$ALLOW_MODS'OptiFine'"
fi
ALLOW_MODS="$ALLOW_MODS]"
ZIP_SPEC_CONFORMANCE_LEVEL=${11}
SIZE_INCREASING_ZIP_OBFUSCATION=${12}
PERCENTAGE_OF_ZIP_STRUCTURES_TUNED_FOR_OBFUSCATION_DISCRETION=${13}
NEVER_STORE_SQUASH_TIMES=${14}
TRANSCODE_OGG=${15}
SAMPLING_FREQUENCY=${16}
TARGET_PITCH=${17}
MINIMUM_BITRATE=${18}
MAXIMUM_BITRATE=${19}
MINIFY_JSON=${20}
DELETE_BLOAT_KEYS=${21}
QUANTIZE_IMAGE=${22}
if [ -n "$QUANTIZE_IMAGE" ]; then
    echo '::error ::quantize_image: Removed in v0.3.0. Delete this option.'
fi
COLOR_QUANTIZATION_TARGET=${23}
MAXIMUM_WIDTH_AND_HEIGHT=${24}
MINIFY_SHADER=${25}
MINIFY_PROPERTIES=${26}
OUTPUT=${27}
CACHE_PATH=${28}

# print version
echo "::group::PackSquash version:"
packsquash --version
echo "::endgroup::"

# change to GitHub WorkSpace Directory
cd "$GITHUB_WORKSPACE" || exit 1

# check cache directory exists
if [ -d $CACHE_PATH ]; then
  # get system id
  PACKSQUASH_SYSTEM_ID=`cat "$CACHE_PATH/system_id"`

  # restore last optimized pack
  cp "$CACHE_PATH/cache_pack.zip" "$OUTPUT"
else
  mkdir "$CACHE_PATH"

  # generate system id
  PACKSQUASH_SYSTEM_ID=`cat /proc/sys/kernel/random/uuid`
  echo "$PACKSQUASH_SYSTEM_ID" > "$CACHE_PATH/system_id"
fi

export PACKSQUASH_SYSTEM_ID

if [ -z "$SETTING_FILE" ]; then
  # generate settings
  echo "
pack_directory = '$DIRECTORY_PATH'
skip_pack_icon = $SKIP_PACK_ICON
recompress_compressed_files = $RECOMPRESS_COMPRESSED_FILES
zip_compression_iterations = $ZIP_COMPRESSION_ITERATIONS
work_around_minecraft_quirks = $WORK_AROUND_MINECRAFT_QUIRKS
ignore_system_and_hidden_files = $IGNORE_SYSTEM_AND_HIDDEN_FILES
allow_mods = $ALLOW_MODS
zip_spec_conformance_level = '$ZIP_SPEC_CONFORMANCE_LEVEL'
size_increasing_zip_obfuscation = $SIZE_INCREASING_ZIP_OBFUSCATION
percentage_of_zip_structures_tuned_for_obfuscation_discretion = $PERCENTAGE_OF_ZIP_STRUCTURES_TUNED_FOR_OBFUSCATION_DISCRETION
never_store_squash_times = $NEVER_STORE_SQUASH_TIMES
output_file_path = '$OUTPUT'

['**/*?.ogg']
transcode_ogg = $TRANSCODE_OGG

['**/*.{og[ga],mp3,wav,flac}']
sampling_frequency = $SAMPLING_FREQUENCY
minimum_bitrate = $MINIMUM_BITRATE
maximum_bitrate = $MAXIMUM_BITRATE
target_pitch = $TARGET_PITCH

['**/*.{json,jsonc}']
minify_json = $MINIFY_JSON
delete_bloat_keys = $DELETE_BLOAT_KEYS

['**/*.png']
color_quantization_target = '$COLOR_QUANTIZATION_TARGET'
maximum_width_and_height = $MAXIMUM_WIDTH_AND_HEIGHT

['**/*.{fsh,vsh}']
minify_shader = $MINIFY_SHADER

['**/*.properties']
minify_properties = $MINIFY_PROPERTIES

" > packsquash-settings.toml

  SETTING_FILE=packsquash-settings.toml
fi

echo '::group::Will use these settings:'
nl -b a $SETTING_FILE
echo "::endgroup::"

# apply timestamp from git
./git-set-file-times.sh

# optimize
packsquash packsquash-settings.toml

# save optimized pack
cp "$OUTPUT" "$CACHE_PATH/cache_pack.zip"
