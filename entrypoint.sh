#!/bin/sh -e

readonly UNUSABLE_CACHE_ERROR_CODE=129
readonly ACTION_WORKING_DIR='/opt/action'

show_deprecated_warning() {
    printf '::warning::The %s option is deprecated and will be removed in the future. Please use %s instead.\n' "$1" "$2"
}

download_release_executable() {
    echo "Downloading PackSquash executable for release $1 (asset $2)"

    temp_file=$(mktemp)
    wget -nv -O "$temp_file" "https://github.com/ComunidadAylas/PackSquash/releases/download/$1/$2"

    echo '::debug::Extracting archive'
    unzip -o "$temp_file"
    rm -f "$temp_file"
}

# ----------------
# Check invariants
# ----------------

echo "::debug::Checking that the repository checkout at $GITHUB_WORKSPACE is suitable"
if [ "$(git -C "$GITHUB_WORKSPACE" rev-parse --is-shallow-repository)" = 'true' ]; then
    echo '::error::The full commit history of the repository must be checked out for this action to work. Please set the fetch-depth parameter of actions/checkout to 0.'
    exit 1
fi

# Make sure our working directory is outside the repository, so any
# temporary file we create does not pollute it
cd "$ACTION_WORKING_DIR"

# ------------------------
# Handle deprecated inputs
# ------------------------

echo '::debug::Handling deprecated inputs'

if [ -n "$INPUT_SETTINGS_FILE" ]; then
    show_deprecated_warning 'settings_file' 'options_file'

    INPUT_OPTIONS_FILE="$INPUT_SETTINGS_FILE"
fi

if [ -n "$INPUT_STRICT_ZIP_SPEC_COMPLIANCE" ]; then
    show_deprecated_warning 'strict_zip_spec_compliance' 'zip_spec_conformance_level'

    if [ "$INPUT_STRICT_ZIP_SPEC_COMPLIANCE" = 'true' ]; then
        INPUT_ZIP_SPEC_CONFORMANCE_LEVEL='high'
    else
        INPUT_ZIP_SPEC_CONFORMANCE_LEVEL='disregard'
    fi
fi

if [ -n "$INPUT_COMPRESS_ALREADY_COMPRESSED_FILES" ]; then
    show_deprecated_warning 'compress_already_compressed_files' 'recompress_compressed_files'

    INPUT_RECOMPRESS_COMPRESSED_FILES="$INPUT_COMPRESS_ALREADY_COMPRESSED_FILES"
fi

if [ -n "$INPUT_QUANTIZE_IMAGE" ]; then
    show_deprecated_warning 'quantize_image' 'image_color_quantization_target'

    if [ "$INPUT_QUANTIZE_IMAGE" = 'true' ]; then
        INPUT_IMAGE_COLOR_QUANTIZATION_TARGET='eight_bit_depth'
    else
        INPUT_IMAGE_COLOR_QUANTIZATION_TARGET='none'
    fi
fi

# ----------------------------------------------------------
# Handle options that need to be converted to another format
# ----------------------------------------------------------

# allow_mods
ALLOW_MODS='[ '
if [ "$INPUT_ALLOW_OPTIFINE_MOD" = 'true' ]; then
    echo '::debug::Allowing OptiFine mod'
    ALLOW_MODS="$ALLOW_MODS'OptiFine'"
fi
ALLOW_MODS="$ALLOW_MODS ]"

# work_around_minecraft_quirks
WORK_AROUND_MINECRAFT_QUIRKS='[ '
if [ "$INPUT_WORK_AROUND_GRAYSCALE_TEXTURES_GAMMA_MISCORRECTION_QUIRK" = 'true' ]; then
    WORK_AROUND_MINECRAFT_QUIRKS="$WORK_AROUND_MINECRAFT_QUIRKS'grayscale_textures_gamma_miscorrection'"
    echo '::debug::Adding grayscale_textures_gamma_miscorrection quirk'
    minecraft_quirk_added=
fi
if [ "$INPUT_WORK_AROUND_JAVA8_ZIP_OBFUSCATION_QUIRKS" = 'true' ]; then
    WORK_AROUND_MINECRAFT_QUIRKS="$WORK_AROUND_MINECRAFT_QUIRKS${minecraft_quirk_added+, }'java8_zip_obfuscation_quirks'"
    echo '::debug::Adding java8_zip_obfuscation_quirks quirk'
    minecraft_quirk_added=
fi
WORK_AROUND_MINECRAFT_QUIRKS="$WORK_AROUND_MINECRAFT_QUIRKS ]"

printf '::debug::After processing input options, environment variables are:\n%s\n' "$(env)"

# ----------------------
# Flags based on options
# ----------------------

if
    [ -n "$INPUT_OPTIONS_FILE" ] || \
    { [ "$INPUT_NEVER_STORE_SQUASH_TIMES" = 'false' ] && [ "$INPUT_ZIP_SPEC_CONFORMANCE_LEVEL" != 'pedantic' ]; }
then
    echo '::debug::Setting cache may be used flag'
    cache_may_be_used=
fi

# ----------------------------------------------
# Download the appropriate PackSquash executable
# ----------------------------------------------

echo "::debug::PackSquash version input variable value: $INPUT_PACKSQUASH_VERSION"

case "$INPUT_PACKSQUASH_VERSION" in
    'latest')
        if [ -z "$INPUT_GITHUB_TOKEN" ]; then
            echo '::error::A GitHub API token is required to download the latest PackSquash build. Please set the github_token action parameter to a suitable token.'
            exit 1
        else
            echo '::debug::Getting latest artifact endpoint'
            latest_artifacts_endpoint=$(curl -sSL 'https://api.github.com/repos/ComunidadAylas/PackSquash/actions/runs?branch=master&status=completed' \
            | jq '.workflow_runs | map(select(.workflow_id == 5482008 and .conclusion == "success"))' \
            | jq -r 'sort_by(.updated_at) | reverse | .[0].artifacts_url')

            echo '::debug::Getting latest artifact download URL from API endpoint'
            latest_artifact_download_url=$(curl -sSL "$latest_artifacts_endpoint" \
            | jq '.artifacts | map(select(.name == "PackSquash executable (Linux, x64, glibc)"))' \
            | jq -r '.[0].archive_download_url')

            echo "Downloading latest PackSquash build from $latest_artifact_download_url"
            temp_file=$(mktemp)
            wget --header="Authorization: token $INPUT_GITHUB_TOKEN" -nv -O "$temp_file" "$latest_artifact_download_url"

            echo '::debug::Extracting artifact'
            unzip -o "$temp_file"
            rm -f "$temp_file"
        fi
    ;;
    'v0.1.0' | 'v0.1.1' | 'v0.1.2' | 'v0.2.0' | 'v0.2.1')
        if [ -z "$INPUT_OPTIONS_FILE" ]; then
            echo '::error::Using older PackSquash versions without an options file is not supported.'
            exit 1
        else
            if [ "$INPUT_PACKSQUASH_VERSION" = 'v0.3.0-rc.1' ]; then
                asset_name='PackSquash.executable.Linux.x64.glibc.zip'
            else
                asset_name='PackSquash.executable.Linux.zip'
            fi

            download_release_executable "$INPUT_PACKSQUASH_VERSION" "$asset_name"
        fi
    ;;
    *)
        # Another release that does not require any special handling
        download_release_executable "$INPUT_PACKSQUASH_VERSION" 'PackSquash.executable.Linux.x64.glibc.zip'
    ;;
esac

chmod +x packsquash

# Print PackSquash version
echo '::group::PackSquash version'
./packsquash --version
echo '::endgroup::'

# ---------------------------
# Generate PackSquash options
# ---------------------------

if [ -z "$INPUT_OPTIONS_FILE" ]; then
    cat <<OPTIONS_FILE > packsquash-options.toml
pack_directory = '$INPUT_PATH'
skip_pack_icon = $INPUT_SKIP_PACK_ICON
recompress_compressed_files = $INPUT_RECOMPRESS_COMPRESSED_FILES
zip_compression_iterations = $INPUT_ZIP_COMPRESSION_ITERATIONS
work_around_minecraft_quirks = $WORK_AROUND_MINECRAFT_QUIRKS
ignore_system_and_hidden_files = $INPUT_IGNORE_SYSTEM_AND_HIDDEN_FILES
allow_mods = $ALLOW_MODS
zip_spec_conformance_level = '$INPUT_ZIP_SPEC_CONFORMANCE_LEVEL'
size_increasing_zip_obfuscation = $INPUT_SIZE_INCREASING_ZIP_OBFUSCATION
percentage_of_zip_structures_tuned_for_obfuscation_discretion = $INPUT_PERCENTAGE_OF_ZIP_STRUCTURES_TUNED_FOR_OBFUSCATION_DISCRETION
never_store_squash_times = $INPUT_NEVER_STORE_SQUASH_TIMES
output_file_path = '$ACTION_WORKING_DIR/pack.zip'

['**/*.{og[ga],mp3,wav,flac}']
transcode_ogg = $INPUT_TRANSCODE_OGG
sampling_frequency = $INPUT_SAMPLING_FREQUENCY
minimum_bitrate = $INPUT_MINIMUM_BITRATE
maximum_bitrate = $INPUT_MAXIMUM_BITRATE
target_pitch = $INPUT_TARGET_PITCH

['**/*.{json,jsonc}']
minify_json = $INPUT_MINIFY_JSON
delete_bloat_keys = $INPUT_DELETE_BLOAT_JSON_KEYS

['**/*.png']
image_data_compression_iterations = $INPUT_IMAGE_DATA_COMPRESSION_ITERATIONS
color_quantization_target = '$INPUT_IMAGE_COLOR_QUANTIZATION_TARGET'
maximum_width_and_height = $INPUT_MAXIMUM_IMAGE_WIDTH_AND_HEIGHT
skip_alpha_optimizations = $INPUT_SKIP_IMAGE_ALPHA_OPTIMIZATIONS

['**/*.{fsh,vsh}']
minify_shader = $INPUT_MINIFY_SHADERS

['**/*.properties']
minify_properties = $INPUT_MINIFY_PROPERTIES
OPTIONS_FILE
else
    cp "$GITHUB_WORKSPACE/$INPUT_OPTIONS_FILE" packsquash-options.toml
fi

echo '::group::PackSquash options'
nl -ba -nln packsquash-options.toml
echo '::endgroup::'

# Calculate the options file hash, so we can discard the cache if the options
# are not the same. We consider that collisions do not happen; if they do,
# they should be easily fixable by tweaking the options file a bit anyway
options_file_hash=$(md5sum packsquash-options.toml)
options_file_hash="${options_file_hash%% *}"

# -------------
# Restore cache
# -------------

# Restore ./pack.zip from the previous artifact and ./system_id from the cache if needed
if [ -n "${cache_may_be_used+x}" ]; then
    echo '::group::Restoring cached data'
    node actions-artifact-download.mjs || true
    node actions-cache.mjs restore "$options_file_hash"
    echo '::endgroup::'
fi

# Only override the system ID if the user didn't set it explicitly
PACKSQUASH_SYSTEM_ID="$INPUT_SYSTEM_ID"
if [ -z "$PACKSQUASH_SYSTEM_ID" ]; then
    PACKSQUASH_SYSTEM_ID=$(cat system_id 2>/dev/null || true)
fi

# If we don't have an UUID, ask the kernel for one. This UUID is generated with a CSPRNG
if [ -z "$PACKSQUASH_SYSTEM_ID" ]; then
    PACKSQUASH_SYSTEM_ID=$(cat /proc/sys/kernel/random/uuid)
fi

# Prevent the actual system ID used from leaking in the logs from now on,
# and export it to other processes
echo "::debug::Using system ID: $PACKSQUASH_SYSTEM_ID"
echo "::add-mask::$PACKSQUASH_SYSTEM_ID"
export PACKSQUASH_SYSTEM_ID

# -----------------
# Optimize the pack
# -----------------

cd "$GITHUB_WORKSPACE"

# Make sure the file modification times reflect when they were modified according to git,
# so the cache works as expected
if [ -n "${cache_may_be_used+x}" ]; then
    echo '::debug::Setting repository file modification timestamps'
    "$ACTION_WORKING_DIR"/git-set-file-times.pl
fi

# Run PackSquash
echo '::group::PackSquash output'
set +e
"$ACTION_WORKING_DIR"/packsquash "$ACTION_WORKING_DIR"/packsquash-options.toml 2>&1
packsquash_exit_code=$?
set -e
echo '::endgroup::'
case $packsquash_exit_code in
    "$UNUSABLE_CACHE_ERROR_CODE")
        echo 'PackSquash reported that the cache was unusable. Discarding it and trying again.'

        rm -f "$ACTION_WORKING_DIR"/pack.zip

        echo '::group::PackSquash output (discarded cache)'
        "$ACTION_WORKING_DIR"/packsquash "$ACTION_WORKING_DIR"/packsquash-options.toml 2>&1
        echo '::endgroup::'
    ;;
    0) ;;
    *)
        # Any other PackSquash error
        exit $packsquash_exit_code
    ;;
esac

# ------------------------------------
# Upload artifact and update the cache
# ------------------------------------

cd "$ACTION_WORKING_DIR"

echo '::group::Upload generated ZIP file as artifact'
node actions-artifact-upload.mjs
echo '::endgroup::'

if [ -n "${cache_may_be_used+x}" ] && ! [ -f '/tmp/packsquash_cache_hit' ]; then
    echo '::group::Caching data for future runs'
    echo "$PACKSQUASH_SYSTEM_ID" > system_id
    node actions-cache.mjs save "$options_file_hash"
    echo '::endgroup::'
fi
