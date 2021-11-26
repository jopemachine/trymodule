import fs from 'node:fs';
import isPromiseLike from 'is-promise';

export function pathExistsSync(path: string) {
	try {
		fs.accessSync(path);
		return true;
	} catch {
		return false;
	}
}

export const isPromise = (object: PromiseLike<any>): object is Promise<any> => isPromiseLike(object) && (object as Promise<any>).catch !== undefined;
