import fs from 'node:fs';

export function pathExistsSync(path: string) {
	try {
		fs.accessSync(path);
		return true;
	} catch {
		return false;
	}
}
