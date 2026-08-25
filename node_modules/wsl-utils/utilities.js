export function parseMountPointFromConfig(content) {
	for (const line of content.split('\n')) {
		// Skip comment lines
		if (/^\s*#/.test(line)) {
			continue;
		}

		// Match root at start of line (after optional whitespace)
		const match = /^\s*root\s*=\s*(?<mountPoint>"[^"]*"|'[^']*'|[^#]*)/.exec(line);
		if (!match) {
			continue;
		}

		return match.groups.mountPoint
			.trim()
			// Strip surrounding quotes
			.replaceAll(/^["']|["']$/g, '');
	}
}
