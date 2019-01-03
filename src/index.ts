#! /usr/bin/env node

import commander from 'commander';
import { Downloader } from './downloader';
import { Generator } from './generator';
import { readFileSync } from 'fs';
import { join } from 'path';

const { version } = JSON.parse(readFileSync(join(__dirname, '../package.json'), { encoding: 'utf8' }));
const downloader = new Downloader();
const generator = new Generator();

downloader.api$.subscribe();
generator.apiFile$.subscribe();

commander
  .version(version)
  .name('swagger-api-ts-generator')
  .arguments('<uri>')
  .option('-o, --output [dir], default', 'Api output dir, default: "./api"')
  .action((uri: string, options) => {
    if (uri) {
      const { output } = options;
      generator.generate(downloader.api$, output || './api');
      downloader.donwload(uri);
    } else {
      commander.outputHelp()
    }
  })
  .parse(process.argv);

if (!process.argv.slice(2).length) {
  commander.outputHelp();
}
