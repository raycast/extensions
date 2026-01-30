'use strict';
const TRANSLATE_PATH = 'https://translate.google.';

const DEFAULT_OPTIONS = {
	from: 'auto',
	to: 'en',
	autoCorrect: false,
	tld: 'com',
	requestFunction(url, fetchinit) { return fetch(url, fetchinit); },
	requestOptions: {
		credentials: 'omit',
		headers: {}	
	},
	fallbackBatch: true,
	forceBatch: true,
	forceFrom: false,
	forceTo: false,
	rejectOnPartialFail: true,
};

Object.freeze(DEFAULT_OPTIONS.requestOptions);
Object.freeze(DEFAULT_OPTIONS);

module.exports = { DEFAULT_OPTIONS, TRANSLATE_PATH };