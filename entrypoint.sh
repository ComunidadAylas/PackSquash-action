#!/bin/sh -e

readonly UNUSABLE_CACHE_ERROR_CODE=129
readonly ACTION_WORKING_DIR='/opt/action'
readonly PACK_ZIP_PATH='/var/lib/packsquash/pack.zip'
readonly PROBLEM_MATCHER_FILE_NAME='packsquash-problem-matcher.json'

# ----------------
# Useful functions
# ----------------

# Downloads the specified PackSquash release executable.
# Parameters:
# $1: release tag
# $2: asset name
download_packsquash_release_executable() {
    echo "Downloading PackSquash executable for release $1 (asset $2)"

    temp_file=$(mktemp)
    wget -nv -O "$temp_file" "https://github.com/ComunidadAylas/PackSquash/releases/download/$1/$2"

    echo '::debug::Extracting archive'
    unzip -o "$temp_file"
    rm -f "$temp_file"
}

# Downloads the latest artifact generated by a workflow ID, identified by its name,
# on the specified repository and branch.
# Parameters:
# $1: repository, in format owner/name
# $2: branch
# $3: numeric ID of the workflow that generated the artifact
# $4: name of the artifact to download
download_latest_artifact() {
    echo "Downloading latest $4 artifact"

    echo "::debug::Getting API endpoint for latest $4 artifact (repository: $1, branch: $2, workflow ID: $3)"
    latest_artifacts_endpoint=$(wget${INPUT_TOKEN:+ --header "Authorization: Bearer $INPUT_TOKEN"} -nv -O - \
        "https://api.github.com/repos/$1/actions/runs?branch=$2&status=completed" \
        | jq '.workflow_runs | map(select(.workflow_id == '"$3"' and .conclusion == "success"))' \
        | jq -r 'sort_by(.updated_at) | reverse | .[0].artifacts_url')

    if [ "$latest_artifacts_endpoint" = 'null' ]; then
        echo "Could not get the information API endpoint for the latest $4 artifacts" >&2
        return 1
    fi

    echo "::debug::Getting latest $4 artifact download URL from endpoint"
    latest_artifact_download_url=$(wget${INPUT_TOKEN:+ --header "Authorization: Bearer $INPUT_TOKEN"} -nv -O - \
        "$latest_artifacts_endpoint" \
        | jq '.artifacts | map(select(.name == "'"$4"'"))' \
        | jq -r '.[0].archive_download_url')

    if [ -z "$latest_artifact_download_url" ]; then
        echo "Could not get the download URL for the latest $4 artifact" >&2
        return 2
    fi

    temp_file=$(mktemp)
    wget --header="Authorization: Bearer $INPUT_TOKEN" -nv -O "$temp_file" "$latest_artifact_download_url"

    echo "::debug::Extracting $4 artifact archive"
    unzip -o "$temp_file"
    rm -f "$temp_file"
}

# Gets the workflow ID of the action that is running this container, and stores it at
# the CURRENT_WORKFLOW_ID variable, if it was not already retrieved.
# This function has no parameters.
get_current_workflow_id() {
    if [ -z "${CURRENT_WORKFLOW_ID+x}" ]; then
        response=$(wget${INPUT_TOKEN:+ --header "Authorization: Bearer $INPUT_TOKEN"} -nv -O - \
            "https://api.github.com/repos/$GITHUB_REPOSITORY/actions/workflows" 2>/run/workflow-id-stderr || true)

        if [ -n "$response" ]; then
            rm -f /run/workflow-id-stderr
            CURRENT_WORKFLOW_ID=$(printf '%s' "$response" | jq -r '.workflows | map(select(.name == "'"$GITHUB_WORKFLOW"'")) | .[0].id')
        else
            echo "::error::Could not get the current workflow ID: $(cat /run/workflow-id-stderr)"
            return 1
        fi
    fi
}

# Runs PackSquash with the options file available at a conventional path. An action log
# group will be created, and a problem matcher associated with the PackSquash output,
# to highlight any potential errors or warnings that may need user attention.
# Parameters:
# $1: a descriptive string to append to the action log group that will contain
# PackSquash output.
run_packsquash() {
    echo "::add-matcher::$HOME/$PROBLEM_MATCHER_FILE_NAME"

    echo "::group::PackSquash output${1:+ ($1)}"
    "$ACTION_WORKING_DIR"/packsquash "$ACTION_WORKING_DIR"/packsquash-options.toml 2>&1
    packsquash_exit_code=$?
    echo '::endgroup::'

    echo '::remove-matcher owner=packsquash-error::'
    echo '::remove-matcher owner=packsquash-warning::'

    return $packsquash_exit_code
}

# Prints an unsupported machine type error message, hinting some possible solutions to
# the user, and then aborts the script execution with an error.
# Parameters:
# $1: the affected PackSquash version.
# $2: if not null, hints to use another runner or request support for this machine type.
# $3: if not null, hints to upgrade to a newer PackSquash version.
readonly MACHINE_TYPE_ERROR_UNSUPPORTED_HINT='Please use a runner with a supported architecture, or request support for it.'
readonly MACHINE_TYPE_ERROR_UPGRADE_HINT='A newer version might add support for this architecture.'
print_unsupported_machine_error() {
    echo "::error::$1 does not support $machine.${2:+ $MACHINE_TYPE_ERROR_UNSUPPORTED_HINT}${3:+ $MACHINE_TYPE_ERROR_UPGRADE_HINT}"
    exit 1
}

# -----------------
# Set preconditions
# -----------------

# Make sure our working directory is outside the repository, so any
# temporary file we create does not pollute it
cd "$ACTION_WORKING_DIR"

# Make sure the directory where we will put the generated pack exists
mkdir -p "${PACK_ZIP_PATH%/*}"

# Put the problem matcher file we will use in the home directory.
# This directory is shared with the host runner via a Docker volume (-v
# option in docker run), and according to the GitHub documentation is meant
# to contain user-related data, which is close enough. Also, a contributor
# to the Actions Toolkit repo suggests putting this kind of files there:
# https://github.com/actions/toolkit/issues/305#issuecomment-585515210
# Interestingly, $RUNNER_TEMP usually contains this home directory as a
# subdirectory, but using that or another subdirectory of it is either
# less appropriate or convenient.
# Relevant documentation about these shared volumes:
# https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners#file-systems
mv packsquash-problem-matcher.json "$HOME"

# ----------------------------------------------------------
# Handle options that need to be converted to another format
# ----------------------------------------------------------

# allow_mods
ALLOW_MODS='[ '
if [ "$INPUT_ALLOW_OPTIFINE_MOD" = 'true' ]; then
    echo '::debug::Allowing OptiFine mod'
    ALLOW_MODS="$ALLOW_MODS'OptiFine'"
    allow_mods_added=
fi
if [ "$INPUT_ALLOW_MTR3_MOD" = 'true' ]; then
    echo '::debug::Allowing Minecraft Transit Railway 3 mod'
    ALLOW_MODS="$ALLOW_MODS${allow_mods_added+, }'Minecraft Transit Railway 3'"
    allow_mods_added=
fi
ALLOW_MODS="$ALLOW_MODS ]"

# work_around_minecraft_quirks
WORK_AROUND_MINECRAFT_QUIRKS='[ '
if [ "$INPUT_WORK_AROUND_GRAYSCALE_IMAGES_GAMMA_MISCORRECTION_QUIRK" = 'true' ]; then
    WORK_AROUND_MINECRAFT_QUIRKS="$WORK_AROUND_MINECRAFT_QUIRKS'grayscale_images_gamma_miscorrection'"
    echo '::debug::Adding grayscale_images_gamma_miscorrection quirk'
    minecraft_quirk_added=
fi
if [ "$INPUT_WORK_AROUND_JAVA8_ZIP_PARSING_QUIRK" = 'true' ]; then
    WORK_AROUND_MINECRAFT_QUIRKS="$WORK_AROUND_MINECRAFT_QUIRKS${minecraft_quirk_added+, }'java8_zip_parsing'"
    echo '::debug::Adding java8_zip_parsing quirk'
    minecraft_quirk_added=
fi
if [ "$INPUT_WORK_AROUND_RESTRICTIVE_BANNER_LAYER_TEXTURE_FORMAT_CHECK_QUIRK" = 'true' ]; then
    WORK_AROUND_MINECRAFT_QUIRKS="$WORK_AROUND_MINECRAFT_QUIRKS${minecraft_quirk_added+, }'restrictive_banner_layer_texture_format_check'"
    echo '::debug::Adding restrictive_banner_layer_texture_format_check quirk'
    minecraft_quirk_added=
fi
if [ "$INPUT_WORK_AROUND_BAD_ENTITY_EYE_LAYER_TEXTURE_TRANSPARENCY_BLENDING_QUIRK" = 'true' ]; then
    WORK_AROUND_MINECRAFT_QUIRKS="$WORK_AROUND_MINECRAFT_QUIRKS${minecraft_quirk_added+, }'bad_entity_eye_layer_texture_transparency_blending'"
    echo '::debug::Adding bad_entity_eye_layer_texture_transparency_blending quirk'
    minecraft_quirk_added=
fi
WORK_AROUND_MINECRAFT_QUIRKS="$WORK_AROUND_MINECRAFT_QUIRKS ]"

# force_include_files
FORCE_INCLUDE_FILES=''
while read -r file_name; do
  if [ -n "$file_name" ]; then
    FORCE_INCLUDE_FILES="$FORCE_INCLUDE_FILES${force_include_file_added+

}['$file_name']
force_include = true"
    force_include_file_added=
  fi
done <<FORCE_INCLUDE_FILE_LIST
$INPUT_FORCE_INCLUDE_FILES
FORCE_INCLUDE_FILE_LIST

# Uncomment when needed. GitHub doesn't like newlines that env outputs
#printf '::debug::After processing input options, environment variables are:\n%s\n' "$(env)"

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

# If caching may be used (more precisely, the git-set-file-times.pl script would be executed),
# check that the repo is not a shallow one, because if it is we will be missing time data
if [ -n "${cache_may_be_used+x}" ]; then
    echo "::debug::Checking that the repository checkout at $GITHUB_WORKSPACE is not shallow"
    if [ "$(git -C "$GITHUB_WORKSPACE" rev-parse --is-shallow-repository)" = 'true' ]; then
        echo '::error::The full commit history of the repository must be checked out. Please set the fetch-depth parameter of actions/checkout to 0.'
        exit 1
    fi
fi

# ----------------------------------------------
# Download the appropriate PackSquash executable
# ----------------------------------------------

echo "::debug::PackSquash version input variable value: $INPUT_PACKSQUASH_VERSION"

machine=$(uname -m)

echo "::debug::Container machine type: $machine"

case "$INPUT_PACKSQUASH_VERSION" in
    'latest')
        case "$machine" in
            'x86_64')
                machine_infix='x64'
            ;;
            'arm64' | 'aarch64')
                machine_infix='AArch64-ARM64'
            ;;
            *)
                print_unsupported_machine_error 'The latest PackSquash build' 'y' ''
            ;;
        esac

        download_latest_artifact 'ComunidadAylas/PackSquash' 'master' 5482008 "PackSquash executable (Linux, $machine_infix, glibc)"
    ;;
    'v0.1.0' | 'v0.1.1' | 'v0.1.2' | 'v0.2.0' | 'v0.2.1' | 'v0.3.0-rc.1' | 'v0.3.0')
        # Historical releases
        if [ -z "$INPUT_OPTIONS_FILE" ]; then
            echo '::error::Using older PackSquash versions without an options file is not supported.'
            exit 1
        else
            case "$INPUT_PACKSQUASH_VERSION" in
                'v0.3.0-rc.1' | 'v0.3.0')
                    case "$machine" in
                        'x86_64')
                            machine_infix='x64'
                        ;;
                        'arm64' | 'aarch64')
                            machine_infix='AArch64-ARM64'
                        ;;
                        *)
                            print_unsupported_machine_error "PackSquash $INPUT_PACKSQUASH_VERSION" '' 'y'
                        ;;
                    esac

                    asset_name="PackSquash.executable.Linux.${machine_infix}.glibc.zip"
                ;;
                *)
                    if [ "$machine" != 'x86_64' ]; then
                        print_unsupported_machine_error "PackSquash $INPUT_PACKSQUASH_VERSION" '' 'y'
                    fi

                    asset_name='PackSquash.executable.Linux.zip'
                ;;
            esac

            download_packsquash_release_executable "$INPUT_PACKSQUASH_VERSION" "$asset_name"
        fi
    ;;
    'v0.3.1')
        # Current releases
        case "$machine" in
            'x86_64')
                machine_infix='x64'
            ;;
            'arm64' | 'aarch64')
                machine_infix='AArch64-ARM64'
            ;;
            *)
                print_unsupported_machine_error 'PackSquash' 'y' 'y'
            ;;
        esac

        download_packsquash_release_executable "$INPUT_PACKSQUASH_VERSION" "PackSquash.executable.Linux.${machine_infix}.glibc.zip"
    ;;
    *)
        echo "::error::Unsupported PackSquash version: $INPUT_PACKSQUASH_VERSION"
        exit 1
    ;;
esac

chmod +x packsquash

# Print PackSquash version
echo '::group::PackSquash version'
./packsquash --version 2>&1
echo '::endgroup::'

# ---------------------------
# Generate PackSquash options
# ---------------------------

if [ -z "$INPUT_OPTIONS_FILE" ]; then
    cat <<OPTIONS_FILE > packsquash-options.toml
pack_directory = '$INPUT_PATH'
skip_pack_icon = $INPUT_SKIP_PACK_ICON
validate_pack_metadata_file = $INPUT_VALIDATE_PACK_METADATA_FILE
recompress_compressed_files = $INPUT_RECOMPRESS_COMPRESSED_FILES
zip_compression_iterations = $INPUT_ZIP_COMPRESSION_ITERATIONS
automatic_minecraft_quirks_detection = $INPUT_AUTOMATIC_MINECRAFT_QUIRKS_DETECTION
work_around_minecraft_quirks = $WORK_AROUND_MINECRAFT_QUIRKS
automatic_asset_types_mask_detection = $INPUT_AUTOMATIC_ASSET_TYPES_MASK_DETECTION
ignore_system_and_hidden_files = $INPUT_IGNORE_SYSTEM_AND_HIDDEN_FILES
allow_mods = $ALLOW_MODS
zip_spec_conformance_level = '$INPUT_ZIP_SPEC_CONFORMANCE_LEVEL'
size_increasing_zip_obfuscation = $INPUT_SIZE_INCREASING_ZIP_OBFUSCATION
percentage_of_zip_structures_tuned_for_obfuscation_discretion = $INPUT_PERCENTAGE_OF_ZIP_STRUCTURES_TUNED_FOR_OBFUSCATION_DISCRETION
never_store_squash_times = $INPUT_NEVER_STORE_SQUASH_TIMES
output_file_path = '$PACK_ZIP_PATH'

['**/*.{og[ga],mp3,wav,flac}']
transcode_ogg = $INPUT_TRANSCODE_OGG
sampling_frequency = $INPUT_AUDIO_SAMPLING_FREQUENCY
minimum_bitrate = $INPUT_MINIMUM_AUDIO_BITRATE
maximum_bitrate = $INPUT_MAXIMUM_AUDIO_BITRATE
target_pitch = $INPUT_TARGET_AUDIO_PITCH

['**/*.{json,jsonc,mcmeta,mcmetac,jpm,jpmc,jem,jemc,bbmodel,bbmodelc}']
minify_json = $INPUT_MINIFY_JSON_FILES
delete_bloat_keys = $INPUT_DELETE_BLOAT_JSON_KEYS
always_allow_json_comments = $INPUT_ALWAYS_ALLOW_JSON_COMMENTS

['**/*.png']
image_data_compression_iterations = $INPUT_IMAGE_DATA_COMPRESSION_ITERATIONS
color_quantization_target = '$INPUT_IMAGE_COLOR_QUANTIZATION_TARGET'
color_quantization_dithering_level = $INPUT_IMAGE_COLOR_QUANTIZATION_DITHERING_LEVEL
maximum_width_and_height = $INPUT_MAXIMUM_IMAGE_WIDTH_AND_HEIGHT
skip_alpha_optimizations = $INPUT_SKIP_IMAGE_ALPHA_OPTIMIZATIONS

['**/*.{fsh,vsh}']
minify_shader = $INPUT_MINIFY_SHADERS

['**/*.lang']
minify_legacy_language = $INPUT_MINIFY_LEGACY_LANGUAGE_FILES
strip_legacy_language_bom = $INPUT_STRIP_LEGACY_LANGUAGE_FILES_BOM

['**/*.mcfunction']
minify_command_function = $INPUT_MINIFY_COMMAND_FUNCTION_FILES

['**/*.properties']
minify_properties = $INPUT_MINIFY_PROPERTIES_FILES${FORCE_INCLUDE_FILES:+$(printf '\n\n%s\n' "$FORCE_INCLUDE_FILES")}
OPTIONS_FILE
else
    cp "$GITHUB_WORKSPACE/$INPUT_OPTIONS_FILE" packsquash-options.toml
fi

echo '::group::PackSquash options'
nl -ba -nln packsquash-options.toml
echo '::endgroup::'

# Calculate the options file hash, so we can discard the cache if the options
# are not the same. We consider that collisions do not happen; if they do,
# they should be easily fixable by tweaking the options file a bit or chaging
# the cache version
options_file_hash=$(md5sum packsquash-options.toml)
options_file_hash="${options_file_hash%% *}"

# -------------
# Restore cache
# -------------

# Restore the pack ZIP from the previous artifact and ./system_id from the cache if
# needed, and if this workflow has been run at least once
if [ -n "${cache_may_be_used+x}" ]; then
    echo '::group::Restoring cached data'
    get_current_workflow_id
    if ! download_latest_artifact "$GITHUB_REPOSITORY" "$(git -C "$GITHUB_WORKSPACE" branch --show-current)" \
        "$CURRENT_WORKFLOW_ID" "$INPUT_ARTIFACT_NAME"; then
        echo '::warning::Could not fetch the ZIP file generated in the last run. PackSquash will thus not be' \
             'able to reuse it to speed up processing. This is a normal occurence when running a workflow for' \
             'the first time, or after a long time since its last execution.'
    fi
    mv -f "${PACK_ZIP_PATH##*/}" "$PACK_ZIP_PATH" >/dev/null 2>&1 || true
    node actions-cache.mjs 'system_id' restore "$options_file_hash" "$INPUT_ACTION_CACHE_REVISION"
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

# Set PackSquash emoji and color options
PACKSQUASH_EMOJI="$(if [ "$INPUT_LOG_EMOJI" = 'true' ]; then echo 'show'; fi)"
export PACKSQUASH_EMOJI
PACKSQUASH_COLOR="$(if [ "$INPUT_LOG_COLOR" = 'true' ]; then echo 'show'; fi)"
export PACKSQUASH_COLOR

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

# Finally, use PackSquash to optimize the pack
set +e
run_packsquash
packsquash_exit_code=$?
set -e
case $packsquash_exit_code in
    "$UNUSABLE_CACHE_ERROR_CODE")
        echo '::warning::PackSquash reported that the previous ZIP file could not be used to speed up processing. Discarding it.'

        rm -f "$PACK_ZIP_PATH"

        run_packsquash 'discarded previous ZIP file'
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
node actions-artifact-upload.mjs "${PACK_ZIP_PATH%/*}" "$PACK_ZIP_PATH" "$INPUT_ARTIFACT_NAME"
echo '::endgroup::'

if [ -n "${cache_may_be_used+x}" ] && ! [ -f '/run/packsquash-cache-hit' ]; then
    echo '::group::Caching data for future runs'
    echo "$PACKSQUASH_SYSTEM_ID" > system_id
    node actions-cache.mjs 'system_id' save "$options_file_hash" "$INPUT_ACTION_CACHE_REVISION"
    echo '::endgroup::'
fi
