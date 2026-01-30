'use strict';
const { DEFAULT_OPTIONS } = require('../defaults.cjs');
const translate = require('./translate.cjs');

module.exports = class {
	options;
	constructor(options) {
		this.options = {...DEFAULT_OPTIONS, ...options};
	}

	translate(input, options) {
		options = {...this.options, ...options};
		return translate(input, options);
	}
};