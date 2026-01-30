'use strict';
const { DEFAULT_OPTIONS } = require('../defaults.cjs');
const batchTranslate = require('./batchTranslate.cjs');
const singleTranslate = require('./singleTranslate.cjs');

module.exports = function (input, options) {
	options = {...DEFAULT_OPTIONS, ...options};
	if (typeof input === 'string'  && !options.forceBatch) {
		return singleTranslate(input, options).catch(e => {
			if (options.fallbackBatch) {
				return batchTranslate(input, options);
			}
			throw e;
		});
	}
	return batchTranslate(input, options);
};