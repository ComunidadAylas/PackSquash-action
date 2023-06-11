import { endGroup, info, startGroup } from '@actions/core';
import { open } from 'fs/promises';
import { Readable } from 'stream';
import WorkingDirectory from './working_directory';
import TOML from '@iarna/toml';
import { getInputValue } from './action_input';

export class PackSquashOptions {
    private readonly options: TOML.JsonMap;
    public readonly stringifiedOptions: string;
    private readonly workingDirectory: WorkingDirectory;

    private constructor(options: TOML.JsonMap, stringifiedOptions: string, workingDirectory: WorkingDirectory) {
        this.options = options;
        this.stringifiedOptions = stringifiedOptions;
        this.workingDirectory = workingDirectory;
    }

    static async parseAndTweak(workingDirectory: WorkingDirectory) {
        const optionsInputValue = getInputValue('options');

        let optionsStream: NodeJS.ReadableStream;
        try {
            optionsStream = (await open(optionsInputValue)).createReadStream();
        } catch (err) {
            info(`The specified PackSquash options string could not be opened as a file. Treating it as a TOML string instead`);
            optionsStream = Readable.from([optionsInputValue]);
        }

        const options = await TOML.parse.stream(optionsStream);

        // If no output file path was specified, set a default one
        options.output_file_path = options.output_file_path ?? workingDirectory.defaultOutputFile;

        // Use a different default for the ZIP spec conformance level option that is
        // more amenable to continuous integration
        if (!('zip_spec_conformance_level' in options)) {
            options.zip_spec_conformance_level = 'high';
        }

        return new this(options, TOML.stringify(options), workingDirectory);
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
