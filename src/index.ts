import commander from 'commander';
import { Downloader } from './downloader';
import { Generator } from './generator';

const downloader = new Downloader();
const generator = new Generator();

downloader.api$.subscribe();
generator.apiFile$.subscribe();

commander
  .version('0.0.1', '-v --version')
  .arguments('<uri>')
  .option('-o, --output <dir>', 'Api output dir')
  .action((uri: string, options) => {
    const { output } = options;
    generator.generate(downloader.api$, output);
    downloader.donwload(uri);
  })
  .parse(process.argv);
