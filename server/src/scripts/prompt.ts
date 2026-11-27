import readline from "node:readline/promises";
import { Writable } from "node:stream";

export const createPrompt = () => {
    let muted = false;
    const output = new Writable({
        write(chunk, encoding, callback) {
            if (!muted) process.stdout.write(chunk, encoding);
            callback();
        },
    });

    const rl = readline.createInterface({ input: process.stdin, output, terminal: true });

    return {
        ask: (label: string) => rl.question(label),
        askHidden: async (label: string) => {
            process.stdout.write(label);
            muted = true;
            const answer = await rl.question("");
            muted = false;
            process.stdout.write("\n");
            return answer;
        },
        close: () => rl.close(),
    };
};