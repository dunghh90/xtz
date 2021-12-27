import { XtzWebServer } from 'worker-xtz';
import { prepareEnvironment } from './prepareEnvironment';

prepareEnvironment()
  .then(start)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

function start(): void {
  const worker = new XtzWebServer();
  worker.start();
}
