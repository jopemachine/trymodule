#!/usr/bin/env node
import path from 'node:path';
import {createRequire} from 'node:module';
import chalk from 'chalk';
import {execaSync} from 'execa';

const require = createRequire(import.meta.url);

export interface PackageInfo {
	name: string;
	as: string;
	package: any;
}

const packageLocation = (pkg: string, installPath: string): string => path.resolve(installPath, 'node_modules', pkg);

const loadPackage = (moduleName: string, moduleAs: string, installPath: string): PromiseLike<PackageInfo> => new Promise(resolve => {
	try {
		const loadedPackage = require(packageLocation(moduleName, installPath));
		console.log(chalk.blue(`'${moduleName}' was already installed since before!`));
		resolve({name: moduleName, package: loadedPackage, as: moduleAs});
	} catch {
		console.log(chalk.yellow(`Couldn't find '${moduleName}' locally, gonna download it now`));

		const {stdout, exitCode} = execaSync('npm', ['i', '--only=prod', '--prefix', installPath, moduleName], {
			all: true,
		});

		console.log(stdout);

		if (exitCode === 0) {
			resolve({
				name: moduleName,
				package: require(packageLocation(moduleName, installPath)),
				as: moduleAs,
			});
		}
	}
});

export default async (packagesToInstall: Record<string, string>, installPath: string): Promise<PackageInfo[]> => new Promise((resolve, reject) => {
	const promisesForInstallation: Array<PromiseLike<PackageInfo>> = [];

	for (const moduleName of Object.keys(packagesToInstall)) {
		const as = packagesToInstall[moduleName];
		promisesForInstallation.push(loadPackage(moduleName, as!, installPath));
	}

	Promise.all(promisesForInstallation).then(resolve).catch(reject);
});
