const utils = require('./lib/utils');
const generate = require('./lib/generate');

(async () => {
  const args = utils.parseArgs(process.argv.slice(2));
  const config = await utils.readConfig(args.configPath);
  
  await generate(args.inputPath, args.outputPath, config);
})();
