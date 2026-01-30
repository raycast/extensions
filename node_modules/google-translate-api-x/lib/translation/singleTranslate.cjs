'use strict';
const { DEFAULT_OPTIONS, TRANSLATE_PATH } = require('../defaults.cjs');
const TranslationResult = require('./TranslationResult.cjs');
const { getCode } = require('../languages.cjs');

module.exports = function (input, options) {
	options = {...DEFAULT_OPTIONS, ...options, ...input.options};
	const requestOptions = {...DEFAULT_OPTIONS.requestOptions, ...options.requestOptions};
	requestOptions.method = 'POST';
	requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';

	const fromIso = options.forceFrom ? options.from : getCode(options.from);
	if (fromIso === null) {
		return new Promise(() => {
			throw new Error(`From language ${options.from} unsupported, bypass this with setting forceFrom to true if you're certain the iso is correct`, {cause: {options}});
		});
	}

	const toIso = options.forceTo ? options.to : getCode(options.to);
	if (toIso === null) {
		return new Promise(() => {
			throw new Error(`To language ${options.to} unsupported, bypass this with setting forceTo to true if you're certain the iso is correct`, {cause: {options}});
		});
	}

	const params = {
		sl: fromIso,
		tl: toIso,
		q: input.text ?? input
	};

	if (params.q.length === 0) {
		return new Promise((resolve) => {
			const result = new TranslationResult(params.q);
			result.from = fromIso;
			result.to = toIso;
			resolve(result);
		});
	}

	requestOptions.body = new URLSearchParams(params).toString();

	const url = TRANSLATE_PATH + options.tld + '/translate_a/single?client=at&dt=t&dt=rm&dj=1';

	return options.requestFunction(url, requestOptions).then(res => {
		if (res.ok) {
			return res.json();
		}
		throw new Error(res.statusText, {cause: {options, url, response: res}});
	}).then(res => {
		const result = new TranslationResult(res);
		result.from = res.src ?? options.from;
		result.to = options.to;
		for (const sentence of res.sentences) {
			if (typeof sentence.trans !== 'undefined') {
				result.text += sentence.trans;
			} else if (typeof sentence.translit !== 'undefined') {
				result.pronunciation = sentence.translit;
			}
		}
		return result;
	});
};