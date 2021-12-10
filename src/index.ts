#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs';
import chalk from 'chalk';
import {execa} from 'execa';
import logSymbol from 'log-symbols';
import {pathExistsSync} from './utils.js';

export interface PackageInfo {
	name: string;
	as: string;
	package: any;
	version: string;
}

const exportedFileLocation = (packageLocation: string, exportedFile: string) =>
	path.resolve(packageLocation, exportedFile);

const packageLocation = (pkg: string, installPath: string): string =>
	path.resolve(
		installPath,
		'node_modules',
		pkg,
	);

const isString = (arg: any): arg is string => typeof arg === 'string';

const inferEntryScript = (pkgInfo: any): string => {
	const {main, exports} = pkgInfo;

	if (main && isString(main)) {
		return main;
	}

	if (exports) {
		if (isString(exports)) {
			return exports;
		}

		if (exports[0] && isString(exports[0])) {
			return exports[0];
		}
	}

	return 'index.js';
};

const loadPackage = async (moduleName: string, moduleAs: string, installPath: string): Promise<PackageInfo> => new Promise(async resolve => {
	const pkgLocation = packageLocation(moduleName, installPath);

	let pkgInfo: any;
	if (!pathExistsSync(pkgLocation)) {
		console.log(chalk.yellow(`${logSymbol.info} Couldn't find '${moduleName}' locally, gonna download it now`));

		const [installResult, viewResult] = await Promise.all([
			execa('npm', ['i', '--only=prod', '--prefix', installPath, moduleName], {
				all: true,
				stripFinalNewline: false,
				reject: false,
			}),
			execa('npm', ['v', '--json', moduleName], {
				reject: false,
			}),
		]);

		const {stdout, stderr, failed, exitCode} = installResult;
		const {stdout: pkgInfoStdout} = viewResult;

		pkgInfo = JSON.parse(pkgInfoStdout);

		if (failed) {
			console.error(chalk.red(`${logSymbol.error} Failed to install '${moduleName}'. Double check the module name is correct\n\n${stderr}`));
			process.exit(exitCode);
		}

		console.log(stdout);
	} else {
		pkgInfo = JSON.parse(fs.readFileSync(path.resolve(pkgLocation, 'package.json'), {encoding: 'utf-8'}));
		console.log(chalk.blue(`${logSymbol.info} '${moduleName}' was already installed since before!`));
	}

	const exports = inferEntryScript(pkgInfo);

	const exportedFilePath = exportedFileLocation(pkgLocation, exports);

	import(exportedFilePath).then(loadedPackage => {
		const packageToLoad = (loadedPackage.default && Object.keys(loadedPackage).length === 1)
			? loadedPackage.default : loadedPackage;

		resolve({name: moduleName, package: packageToLoad, as: moduleAs, version: pkgInfo.version ?? 'unknown'});
	}).catch(console.error);
});

export default async (packagesToInstall: Record<string, string>, installPath: string): Promise<PackageInfo[]> => new Promise((resolve, reject) => {
	const promisesForInstallation: Array<Promise<PackageInfo>> = [];

	for (const moduleName of Object.keys(packagesToInstall)) {
		const as = packagesToInstall[moduleName];
		promisesForInstallation.push(loadPackage(moduleName, as!, installPath));
	}

	Promise.all(promisesForInstallation).then(resolve).catch(reject);
});
