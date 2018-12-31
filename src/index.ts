import commander from "commander";
import { Downloader } from "./downloader";
import { Generator } from "./generator";


const downloader = new Downloader();
const generator = new Generator();


downloader
    .api$
    .subscribe(
        (api) => {
            console.log(api);
        },
        (error) => {
            console.error(error);
        }
    );

generator.apiFile$.subscribe(([content]) => {

});

commander
    .version('0.0.1', '-v --version')
    .arguments('<uri>')
    .option('-o, --output <dir>', 'Api output dir')
    .action((uri: string, options) => {
        const { output } = options;
        downloader.donwload(uri);
        generator.generate(downloader.api$, output);
    })
    .parse(process.argv);


