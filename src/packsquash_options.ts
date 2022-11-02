import { endGroup, info, startGroup, warning } from '@actions/core';
import { open, writeFile } from 'fs/promises';
import { Readable } from 'stream';
import WorkingDirectory from './working_directory';
import TOML from '@iarna/toml';
import { getInputValue } from './action_input';

export class PackSquashOptions {
    private readonly options: TOML.JsonMap;
    private readonly workingDirectory: WorkingDirectory;

    private constructor(options: TOML.JsonMap, workingDirectory: WorkingDirectory) {
        this.options = options;
        this.workingDirectory = workingDirectory;
    }

    static async parseAndTweak(workingDirectory: WorkingDirectory) {
        const optionsInputValue = getInputValue('options');

        let optionsStream: NodeJS.ReadableStream;
        try {
            optionsStream = (await open(optionsInputValue)).createReadStream();
        } catch (e) {
            info(`The specified PackSquash options string could not be opened as a file: ${e}. Treating it as a TOML string instead`);
            optionsStream = Readable.from([optionsInputValue]);
        }

        const options = await TOML.parse.stream(optionsStream);

        // This path is an implementation detail of the action. We should always set
        // it, overriding any user preferences
        if ('output_file_path' in options) {
            warning('The options set a value for output_file_path, but it will be ignored by the action. Please remove it');
        }
        options.output_file_path = workingDirectory.outputFile;

        // Use a different default for the ZIP spec conformance level option that is
        // more amenable to continuous integration
        if (!('zip_spec_conformance_level' in options)) {
            options.zip_spec_conformance_level = 'high';
        }

        return new this(options, workingDirectory);
    }

    getPackDirectory() {
        return typeof this.options.pack_directory == 'string' ? this.options.pack_directory : undefined;
    }

    mayCacheBeUsed() {
        const neverStoreTimes = typeof this.options.never_store_squash_times == 'boolean' ? this.options.never_store_squash_times : false;
        const zipConformanceLevel = typeof this.options.zip_spec_conformance_level == 'string' ? this.options.zip_spec_conformance_level : 'pedantic';

        return !neverStoreTimes && zipConformanceLevel != 'pedantic';
    }

    async showAndWriteToWorkingDirectory() {
        const stringifiedOptions = TOML.stringify(this.options);

        startGroup('PackSquash options');
        stringifiedOptions
            .trimEnd()
            .split('\n')
            .forEach((line, index) => {
                info(`${(index + 1).toString().padEnd(6, ' ')} ${line}`);
            });
        endGroup();

        await writeFile(this.workingDirectory.optionsFile, stringifiedOptions, 'utf-8');
    }
}
