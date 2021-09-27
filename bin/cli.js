#!/usr/bin/env node

const {Command} = require('commander');
const main = require('../dist/main').default;

const program = new Command();

program
    .argument('<filename>')
    .option(
        '-t, --target <stage>',
        '`<stage>` is one of scan, parse, inter, or assembly. Compilation should proceed to the given stage.'
    )
    .option(
        '-o, --output <outname>',
        'Write output to `<outname>`'
    )
    .option(
        '-O, --opt <optimizations>',
        // eslint-disable-next-line max-len
        'Perform the (comma-separated) listed optimizations. `all` stands for all supported optimizations. `-<optimization>` removes optimizations from the list.'
    )
    .option(
        '-d, --debug',
        // eslint-disable-next-line max-len
        'Print debugging information. If this option is not given, there should be no output to the screen on successful compilation.'
    );

program.parse(process.argv);

const options = program.opts();
const [filename] = program.args;

main(filename, options);
