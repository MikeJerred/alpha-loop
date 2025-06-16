import { exec } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { promisify } from 'node:util';
import 'dotenv/config';

const awaitableExec = promisify(exec);

const addresses = [
  {
    // https://github.com/aave/aave-address-book/blob/main/scripts/generateABIs.ts
    file: 'AaveUiPoolDataProvider.ts',
    name: 'IUiPoolDataProvider_ABI',
    address: '0x3f78bbd206e4d3c504eb854232eda7e47e9fd8fc'
  }
];

for (const { file, name, address } of addresses) {
  const { stdout, stderr } = await awaitableExec(`cast interface --json ${address}`);

  if (stderr) {
    console.error(`Failed to get ABI for ${file} : ${address}`);
    continue;
  }

  const json = `export const ${name} = ${JSON.stringify(JSON.parse(stdout.trim()), null, 2)} as const;`;
  await fs.writeFile(`./src/lib/abi/${file}`, json);
}
