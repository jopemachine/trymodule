#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import chalk from 'chalk';
import {execaSync} from 'execa';
import logSymbol from 'log-symbols';
import {pathExistsSync} from './utils.js';

export interface PackageInfo {
	name: string;
	as: string;
	package: any;
}

const exportedFileLocation = (packageLocation: string, exportedFile: string) =>
	path.resolve(packageLocation, exportedFile);

const packageLocation = (pkg: string, installPath: string): string =>
	path.resolve(
		installPath,
		'node_modules',
		pkg,
	);

const loadPackage = (moduleName: string, moduleAs: string, installPath: string): PromiseLike<PackageInfo> => new Promise(resolve => {
	const pkgLocation = packageLocation(moduleName, installPath);

	if (!pathExistsSync(pkgLocation)) {
		console.log(chalk.yellow(`${logSymbol.info} Couldn't find '${moduleName}' locally, gonna download it now`));

		const {stdout, stderr, failed, exitCode} = execaSync('npm', ['i', '--only=prod', '--prefix', installPath, moduleName], {
			all: true,
			stripFinalNewline: false,
			reject: false,
		});

		if (failed) {
			console.error(chalk.red(`${logSymbol.error} Failed to install '${moduleName}'. Double check the module name is correct\n\n${stderr}`));
			process.exit(exitCode);
		}

		console.log(stdout);
	} else {
		console.log(chalk.blue(`${logSymbol.info} '${moduleName}' was already installed since before!`));
	}

	const {stdout} = execaSync('npm', ['v', '--json', moduleName], {
		all: true,
		stripFinalNewline: false,
		reject: false,
	});

	const pkgInfo = JSON.parse(stdout);
	const exports = pkgInfo.exports ?? pkgInfo.main ?? 'index.js';
	const exportedFilePath = exportedFileLocation(pkgLocation, exports);

	import(exportedFilePath).then(loadedPackage => {
		resolve({name: moduleName, package: loadedPackage.default, as: moduleAs});
	}).catch(console.error);
});

export default async (packagesToInstall: Record<string, string>, installPath: string): Promise<PackageInfo[]> => new Promise((resolve, reject) => {
	const promisesForInstallation: Array<PromiseLike<PackageInfo>> = [];

	for (const moduleName of Object.keys(packagesToInstall)) {
		const as = packagesToInstall[moduleName];
		promisesForInstallation.push(loadPackage(moduleName, as!, installPath));
	}

	Promise.all(promisesForInstallation).then(resolve).catch(reject);
});
