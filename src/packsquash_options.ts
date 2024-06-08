import { endGroup, info, startGroup } from '@actions/core';
import { readFile } from 'fs/promises';
import WorkingDirectory from './working_directory';
import * as TOML from 'smol-toml';
import { getInputValue } from './action_input';

export class PackSquashOptions {
    private readonly options: Record<string, TOML.TomlPrimitive>;
    public readonly stringifiedOptions: string;

    private constructor(options: Record<string, TOML.TomlPrimitive>, stringifiedOptions: string) {
        this.options = options;
        this.stringifiedOptions = stringifiedOptions;
    }

    public static async parseAndTweak(workingDirectory: WorkingDirectory) {
        const optionsInputValue = getInputValue('options');

        let optionsToml: string;
        try {
            optionsToml = await readFile(optionsInputValue, { encoding: 'utf8' });
        } catch (err) {
            info(`The specified PackSquash options string could not be opened as a file. Treating it as a TOML string instead`);
            optionsToml = optionsInputValue;
        }

        const options = await TOML.parse(optionsToml);

        // If no output file path was specified, set a default one
        options.output_file_path = options.output_file_path ?? workingDirectory.defaultOutputFile;

        // Use a different default for the ZIP spec conformance level option that is
        // more amenable to continuous integration
        if (!('zip_spec_conformance_level' in options)) {
            options.zip_spec_conformance_level = 'high';
        }

        return new this(options, TOML.stringify(options));
    }

    getPackDirectory() {
        return typeof this.options.pack_directory == 'string' ? this.options.pack_directory : undefined;
    }

    getOutputFilePath() {
        return this.options.output_file_path as string;
    }

    mayCacheBeUsed() {
        const neverStoreTimes = typeof this.options.never_store_squash_times == 'boolean' ? this.options.never_store_squash_times : false;
        const zipConformanceLevel = typeof this.options.zip_spec_conformance_level == 'string' ? this.options.zip_spec_conformance_level : 'pedantic';

        return !neverStoreTimes && zipConformanceLevel != 'pedantic';
    }

    show() {
        startGroup('PackSquash options');
        this.stringifiedOptions
            .trimEnd()
            .split('\n')
            .forEach((line, index) => {
                info(`${(index + 1).toString().padEnd(6, ' ')} ${line}`);
            });
        endGroup();
    }
}
