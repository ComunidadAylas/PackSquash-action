import { debug, endGroup, getBooleanInput, getInput, getMultilineInput, info, startGroup } from '@actions/core';
import { readFileSync, writeFileSync } from 'fs';

export class Options {
    static Path = 'path';
    static SystemId = 'system_id';
    static PackSquashVersion = 'packsquash_version';
    static OptionsFile = 'options_file';
    static Token = 'token';
    static ActionCacheRevision = 'action_cache_revision';
    static ArtifactName = 'artifact_name';
    static ShowEmojiInPacksquashLogs = 'show_emoji_in_packsquash_logs';
    static EnableColorInPacksquashLogs = 'enable_color_in_packsquash_logs';
    static RecompressCompressedFiles = 'recompress_compressed_files';
    static ZipCompressionIterations = 'zip_compression_iterations';
    static AutomaticMinecraftQuirksDetection = 'automatic_minecraft_quirks_detection';
    static WorkAroundGrayscaleImagesGammaMiscorrectionQuirk = 'work_around_grayscale_images_gamma_miscorrection_quirk';
    static WorkAroundJava8ZipParsingQuirk = 'work_around_java8_zip_parsing_quirk';
    static WorkAroundRestrictiveBannerLayerTextureFormatCheckQuirk = 'work_around_restrictive_banner_layer_texture_format_check_quirk';
    static WorkAroundBadEntityEyeLayerTextureTransparencyBlendingQuirk = 'work_around_bad_entity_eye_layer_texture_transparency_blending_quirk';
    static AutomaticAssetTypesMaskDetection = 'automatic_asset_types_mask_detection';
    static AllowOptifineMod = 'allow_optifine_mod';
    static AllowMtr3Mod = 'allow_mtr3_mod';
    static SkipPackIcon = 'skip_pack_icon';
    static ValidatePackMetadataFile = 'validate_pack_metadata_file';
    static IgnoreSystemAndHiddenFiles = 'ignore_system_and_hidden_files';
    static ZipSpecConformanceLevel = 'zip_spec_conformance_level';
    static SizeIncreasingZipObfuscation = 'size_increasing_zip_obfuscation';
    static PercentageOfZipStructuresTunedForObfuscationDiscretion = 'percentage_of_zip_structures_tuned_for_obfuscation_discretion';
    static NeverStoreSquashTimes = 'never_store_squash_times';
    static TranscodeOgg = 'transcode_ogg';
    static AudioSamplingFrequency = 'audio_sampling_frequency';
    static TargetAudioPitch = 'target_audio_pitch';
    static MinimumAudioBitrate = 'minimum_audio_bitrate';
    static MaximumAudioBitrate = 'maximum_audio_bitrate';
    static MinifyJsonFiles = 'minify_json_files';
    static DeleteBloatJsonKeys = 'delete_bloat_json_keys';
    static AlwaysAllowJsonComments = 'always_allow_json_comments';
    static ImageDataCompressionIterations = 'image_data_compression_iterations';
    static ImageColorQuantizationTarget = 'image_color_quantization_target';
    static ImageColorQuantizationDitheringLevel = 'image_color_quantization_dithering_level';
    static MaximumImageWidthAndHeight = 'maximum_image_width_and_height';
    static SkipImageAlphaOptimizations = 'skip_image_alpha_optimizations';
    static MinifyShaders = 'minify_shaders';
    static MinifyLegacyLanguageFiles = 'minify_legacy_language_files';
    static StripLegacyLanguageFilesBom = 'strip_legacy_language_files_bom';
    static MinifyCommandFunctionFiles = 'minify_command_function_files';
    static MinifyPropertiesFiles = 'minify_properties_files';
    static ForceIncludeFiles = 'force_include_files';
}

/**
 * @returns {string}
 */
function getAllowMods() {
    /**
     * @type {string[]}
     */
    const mods = [];

    if (getBooleanInput(Options.AllowOptifineMod)) {
        debug('Allowing OptiFine mod');
        mods.push('OptiFine');
    }
    if (getBooleanInput(Options.AllowMtr3Mod)) {
        debug('Allowing Minecraft Transit Railway 3 mod');
        mods.push('Minecraft Transit Railway 3');
    }

    return joinStrings(mods);
}

/**
 * @returns {string}
 */
function getWorkAroundMinecraftQuirks() {
    /**
     * @type {string[]}
     */
    const quirks = [];

    if (getBooleanInput(Options.WorkAroundGrayscaleImagesGammaMiscorrectionQuirk)) {
        debug('Adding grayscale_images_gamma_miscorrection quirk');
        quirks.push('grayscale_images_gamma_miscorrection');
    }
    if (getBooleanInput(Options.WorkAroundJava8ZipParsingQuirk)) {
        debug('Adding java8_zip_parsing quirk');
        quirks.push('java8_zip_parsing');
    }
    if (getBooleanInput(Options.WorkAroundRestrictiveBannerLayerTextureFormatCheckQuirk)) {
        debug('Adding restrictive_banner_layer_texture_format_check quirk');
        quirks.push('restrictive_banner_layer_texture_format_check');
    }
    if (getBooleanInput(Options.WorkAroundBadEntityEyeLayerTextureTransparencyBlendingQuirk)) {
        debug('Adding bad_entity_eye_layer_texture_transparency_blending quirk');
        quirks.push('bad_entity_eye_layer_texture_transparency_blending');
    }

    return joinStrings(quirks);
}

/**
 * @returns {string}
 */
function getForceIncludeFiles() {
    return getMultilineInput(Options.ForceIncludeFiles)
        .map(s => `['${s}']\nforce_include = true`)
        .join('\n\n');
}

/**
 * @returns {boolean}
 */
export function shouldUseCache() {
    return !getBooleanInput(Options.NeverStoreSquashTimes) && getInput(Options.ZipSpecConformanceLevel) !== 'pedantic';
}

/**
 * @param {WorkingDirectory} workingDirectory
 * @returns {string}
 */
function getOptionsFileContent(workingDirectory) {
    return `
pack_directory = '${getInput(Options.Path)}'
skip_pack_icon = ${getBooleanInput(Options.SkipPackIcon)}
validate_pack_metadata_file = ${getBooleanInput(Options.ValidatePackMetadataFile)}
recompress_compressed_files = ${getBooleanInput(Options.RecompressCompressedFiles)}
zip_compression_iterations = ${getInput(Options.ZipCompressionIterations)}
automatic_minecraft_quirks_detection = ${getBooleanInput(Options.AutomaticMinecraftQuirksDetection)}
work_around_minecraft_quirks = ${getWorkAroundMinecraftQuirks()}
automatic_asset_types_mask_detection = ${getBooleanInput(Options.AutomaticAssetTypesMaskDetection)}
ignore_system_and_hidden_files = ${getBooleanInput(Options.IgnoreSystemAndHiddenFiles)}
allow_mods = ${getAllowMods()}
zip_spec_conformance_level = '${getInput(Options.ZipSpecConformanceLevel)}'
size_increasing_zip_obfuscation = ${getBooleanInput(Options.SizeIncreasingZipObfuscation)}
percentage_of_zip_structures_tuned_for_obfuscation_discretion = ${getInput(Options.PercentageOfZipStructuresTunedForObfuscationDiscretion)}
never_store_squash_times = ${getBooleanInput(Options.NeverStoreSquashTimes)}
output_file_path = '${workingDirectory.zip}'

['**/*.{og[ga],mp3,wav,flac}']
transcode_ogg = ${getBooleanInput(Options.TranscodeOgg)}
sampling_frequency = ${getInput(Options.AudioSamplingFrequency)}
minimum_bitrate = ${getInput(Options.MinimumAudioBitrate)}
maximum_bitrate = ${getInput(Options.MaximumAudioBitrate)}
target_pitch = ${getInput(Options.TargetAudioPitch)}

['**/*.{json,jsonc,mcmeta,mcmetac,jpm,jpmc,jem,jemc,bbmodel,bbmodelc}']
minify_json = ${getBooleanInput(Options.MinifyJsonFiles)}
delete_bloat_keys = ${getBooleanInput(Options.DeleteBloatJsonKeys)}
always_allow_json_comments = ${getBooleanInput(Options.AlwaysAllowJsonComments)}

['**/*.png']
image_data_compression_iterations = ${getInput(Options.ImageDataCompressionIterations)}
color_quantization_target = '${getInput(Options.ImageColorQuantizationTarget)}'
color_quantization_dithering_level = ${getInput(Options.ImageColorQuantizationDitheringLevel)}
maximum_width_and_height = ${getInput(Options.MaximumImageWidthAndHeight)}
skip_alpha_optimizations = ${getBooleanInput(Options.SkipImageAlphaOptimizations)}

['**/*.{fsh,vsh}']
minify_shader = ${getBooleanInput(Options.MinifyShaders)}

['**/*.lang']
minify_legacy_language = ${getBooleanInput(Options.MinifyLegacyLanguageFiles)}
strip_legacy_language_bom = ${getBooleanInput(Options.StripLegacyLanguageFilesBom)}

['**/*.mcfunction']
minify_command_function = ${getBooleanInput(Options.MinifyCommandFunctionFiles)}

['**/*.properties']
minify_properties = ${getBooleanInput(Options.MinifyPropertiesFiles)}

${getForceIncludeFiles()}`.trim();
}

/**
 * @param {WorkingDirectory} workingDirectory
 * @returns {string}
 */
export function generateOptionsFile(workingDirectory) {
    writeFileSync(workingDirectory.options, getOptionsFileContent(workingDirectory), { encoding: 'utf8' });
    return workingDirectory.options;
}

export async function printOptionsFileContent(path) {
    startGroup('PackSquash options');
    readFileSync(path, { encoding: 'utf8' })
        .split('\n')
        .forEach((line, index) => {
            info(`${index.toString().padEnd(6, ' ')} ${line}`);
        });
    endGroup();
}

/**
 * @param {string[]} list
 * @returns {string}
 */
function joinStrings(list) {
    return `[ ${list.map(s => `'${s}'`).join(', ')} ]`;
}
