import { confirm } from '@inquirer/prompts';
import { blueBright, reset } from 'ansis';
import { default as levenshtein } from 'fast-levenshtein';
import { setTimeout } from 'node:timers/promises';
const getConfirmation = async (suggestion) => {
    const ac = new AbortController();
    const { signal } = ac;
    const confirmation = confirm({
        default: true,
        message: `Did you mean ${blueBright(suggestion)}?`,
        theme: {
            prefix: '',
            style: {
                message: (text) => reset(text),
            },
        },
    });
    setTimeout(10_000, 'timeout', { signal })
        .catch(() => false)
        .then(() => confirmation.cancel());
    return confirmation.then((value) => {
        ac.abort();
        return value;
    });
};
const closest = (target, possibilities) => possibilities
    .map((id) => ({ distance: levenshtein.get(target, id, { useCollator: true }), id }))
    .sort((a, b) => a.distance - b.distance)[0]?.id ?? '';
export default {
    closest,
    getConfirmation,
};
