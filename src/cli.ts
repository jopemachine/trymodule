#! /usr/bin/env node
import repl from 'node:repl';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {exec} from 'node:child_process';
import process from 'node:process';
import chalk from 'chalk';
import logSymbol from 'log-symbols';
import isPromiseLike from 'is-promise';
import {isPromise} from './utils.js';
import replHistory from './repl-history.js';
import loadPackages from './index.js';
import type {PackageInfo} from './index.js';

const TRYMODULE_PATH = process.env['TRYMODULE_PATH'] ?? path.resolve((os.homedir()), '.trymodule');
const TRYMODULE_HISTORY_PATH = process.env['TRYMODULE_HISTORY_PATH'] ?? path.resolve(TRYMODULE_PATH, 'repl_history');

const flags: string[] = [];
const packages: Record<string, string> = {}; // Data looks like [moduleName, as]

const makeVariableFriendly = (string_: string) => string_.replace(/-|\./g, '_');

for (const arg of process.argv.slice(2)) {
	if (arg.startsWith('-')) {
		// Matches '--clear', etc
		flags.push(arg);
	} else if (arg.includes('=')) {
		// Matches 'lodash=_', etc
		const i = arg.indexOf('=');
		const module = arg.slice(0, i); // 'lodash'
		const as = arg.slice(i + 1); // '_'
		packages[module] = makeVariableFriendly(as); // ['lodash', '_']
	} else {
		// Assume it's just a regular module name: 'lodash', 'express', etc
		packages[arg] = makeVariableFriendly(arg); // Call it the module's name
	}
}

if (flags.length === 0 && Object.keys(packages).length === 0) {
	throw new Error(`${logSymbol.error} You need to provide some arguments!`);
}

const logGreen = (message: string) => {
	console.log(chalk.green(message));
};

const hasFlag = (flag: string) => flags.includes(flag);

const addPackageToObject = (object: Record<string, any>, pkg: PackageInfo) => {
	logGreen(`${logSymbol.info} Package '${pkg.name}' was loaded and assigned to '${pkg.as}' in the current scope`);
	object[pkg.as] = pkg.package;
	return object;
};

if (hasFlag('--clear')) {
	console.log(`${logSymbol.info} Removing folder ${TRYMODULE_PATH + '/node_modules'}`);
	exec('rm -r ' + TRYMODULE_PATH + '/node_modules', (error, _stdout, _stderr) => {
		if (!error) {
			logGreen(`${logSymbol.info} Cache successfully cleared!`);
			process.exit(0);
		} else {
			throw new Error(`${logSymbol.error} Could not remove cache! Error ${error.message}`);
		}
	});
} else {
	logGreen(`${logSymbol.info} Gonna start a REPL with packages installed and loaded for you`);

	// Extract
	loadPackages(packages, TRYMODULE_PATH).then(packages => {
		const contextPackages = packages.reduce((context, pkg) => addPackageToObject(context, pkg), {});

		console.log(`${logSymbol.info} REPL started...`);

		if (!process.env['TRYMODULE_NONINTERACTIVE']) {
			const replServer = repl.start({
				prompt: '> ',
				replMode: repl.REPL_MODE_SLOPPY,
				preview: true,
				eval: (cmd: string, _context, _filename, callback) => {
					const script = new vm.Script(cmd);
					const result = script.runInContext(Object.assign(replServer.context, contextPackages));

					// Some libraries use non-native Promise implementations
					// (ie lib$es6$promise$promise$$Promise)
					if (isPromiseLike(result)) {
						console.log(`${logSymbol.info} Returned a Promise. waiting for result...`);

						if (isPromise(result)) {
							result.then((value: any) => {
								callback(null, value);
							}).catch((error: any) => {
								callback(error, undefined);
							});
						} else {
							void result.then((value: any) => {
								callback(null, value);
							});
						}
					} else {
						callback(null, result);
					}
				},
			});

			replHistory(replServer, TRYMODULE_HISTORY_PATH);
		}
	}).catch(console.error);
}
