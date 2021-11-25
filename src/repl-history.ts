import {REPLServer} from 'node:repl';
import fs from 'node:fs';
import process from 'node:process';

// Persist a node repl's history to a file.
export default function (repl: REPLServer, file: string) {
	repl.setupHistory(file, (error: Error | null, repl: REPLServer) => {
		if (error) {
			throw error;
		}

		const fd = fs.openSync(file, 'a');
		const wstream = fs.createWriteStream(file, {fd});
		wstream.on('error', error_ => {
			throw error_;
		});

		repl.addListener('line', (code: string) => {
			if (code && code !== '.history') {
				wstream.write(code + '\n');
			} else {
				// TO do (jopemachine):: Remove '.history' command other than below method.

				// repl.historyIndex++;
				// repl.history.pop();
			}
		});

		process.on('exit', () => {
			fs.closeSync(fd);
		});
	});

	repl.defineCommand('history', {
		help: 'Show the history',
		action() {
			const out = fs.readFileSync(file, {encoding: 'utf-8'}).split('\n');
			repl.output.write(out.reverse().join('\n') + '\n');
			repl.displayPrompt();
		},
	});
}
