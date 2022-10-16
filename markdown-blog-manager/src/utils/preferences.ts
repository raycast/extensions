import { getPreferenceValues } from '@raycast/api';
import { homedir } from 'os';
import { existsSync } from 'fs';

interface Preferences {
	draftsPath: string;
	contentPath: string;
}

export default () => {
	const values = getPreferenceValues<Preferences>();

	values.draftsPath = values.draftsPath.replace('~/', `${homedir()}/`);
	values.contentPath = values.contentPath.replace('~/', `${homedir()}/`);

	// remove trailing slash
	if (values.draftsPath.endsWith('/')) {
		values.draftsPath = values.draftsPath.slice(0, -1);
	}
	if (values.contentPath.endsWith('/')) {
		values.contentPath = values.contentPath.slice(0, -1);
	}

	if (!existsSync(values.draftsPath)) {
		values.draftsPath = '';
	}

	if (!existsSync(values.contentPath)) {
		values.contentPath = '';
	}

	return values;
};
