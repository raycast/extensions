'use strict';
const { DEFAULT_OPTIONS, TRANSLATE_PATH } = require('../defaults.cjs');
const TranslationResult = require('./TranslationResult.cjs');
const { getCode } = require('../languages.cjs');

module.exports = function (input, options) {
	options = {...DEFAULT_OPTIONS, ...options};

	// according to translate.google.com constant rpcids seems to have different values with different POST body format.
    // * MkEWBc - returns translation
    // * AVdN8 - return suggest
    // * exi25c - return some technical info
	const rpcids = 'MkEWBc';
	const queryParams = new URLSearchParams({
		'rpcids': rpcids,
		'source-path': '/',
		'f.sid': '', // as far as I can tell, what is input for f.sid and bl doesn't matter
		'bl': '',
		'hl': 'en-US',
		'soc-app': 1,
		'soc-platform': 1,
		'soc-device': 1,
		'_reqid': Math.floor(1000 + (Math.random() * 9000)),
		'rt': 'c'
	});
	const url = TRANSLATE_PATH + options.tld + '/_/TranslateWebserverUi/data/batchexecute?' + queryParams.toString();

	const requestOptions = {...options.requestOptions, ...DEFAULT_OPTIONS.requestOptions};
	requestOptions.method = 'POST';
	requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
	
	const sourceArray = Array.isArray(input) ? input : (typeof input === 'object' ? Object.values(input) : [input]);
	let finalResult = Array.isArray(input) ? [] : (typeof input === 'object' ? {} : undefined);

	const freq = [];
	for (let i = 0; i < sourceArray.length; i++) {
		const text = sourceArray[i].text ?? sourceArray[i];

		const forceFrom = sourceArray[i].forceFrom ?? options.forceFrom;
		const from = sourceArray[i].from ?? options.from;
		const fromIso = forceFrom ? from : getCode(from);
		if (fromIso === null) {
			return new Promise(() => {
				throw new Error(`From language ${from} unsupported, bypass this with setting forceFrom to true if you're certain the iso is correct`, {cause: {options: {from}}});
			});
		}

		const forceTo = sourceArray[i].forceTo ?? options.forceTo;
		const to = sourceArray[i].to ?? options.to;
		const toIso = forceTo ? to : getCode(to);
		if (toIso === null) {
			return new Promise(() => {
				throw new Error(`To language ${to} unsupported, bypass this with setting forceTo to true if you're certain the iso is correct`, {cause: {options: {to}}});
			});
		}

		const autoCorrect = sourceArray[i].autoCorrect ?? options.autoCorrect;

		if (text.length === 0) {
			const result = new TranslationResult(text);
			result.text = text;
			result.from = fromIso;
			result.to = toIso;
			if (Array.isArray(input)) {
				finalResult[i] = result;
			} else if (typeof input === 'object') {
				finalResult[Object.keys(input)[i]] = result;
			} else {
				finalResult = result;
			}
			continue;
		}

		// i (converted to base 36 to minimize request length) is used as a unique indentifier to order responses
		const freqPart = [rpcids, JSON.stringify([[text, fromIso, toIso, autoCorrect], [null]]), null, i.toString(36)];
		freq.push(freqPart);
	}

	if (freq.length === 0) {
		return new Promise((resolve) => {
			resolve(finalResult);
		});
	}

	requestOptions.body = 'f.req=' + encodeURIComponent(JSON.stringify([freq])) + '&';

	return options.requestFunction(url, requestOptions).then( async res => {
		if (!res.ok) {
			throw new Error(res.statusText, {cause: {options, url, response: res}});
		}
		res = await res.text();
		res = res.slice(6);

		for (let chunk of res.split('\n')) {
			if (chunk[0] !== '[' || chunk[3] === 'e') {
				continue;
			}
			chunk = JSON.parse(chunk);
			for (let translation of chunk) {
				if (translation[0] !== 'wrb.fr') {
					continue;
				}
				const id = parseInt(translation[translation.length - 1], 36);
				if (translation[2] === null) {
					if (!options.rejectOnPartialFail) {
						if (Array.isArray(input)) {
							finalResult[id] = null;
						} else if (typeof input === 'object') {
							finalResult[Object.keys(input)[id]] = null;
						} else {
							finalResult = null;
						}
						continue;
					}
					throw new Error(
						'Partial Translation Request Fail: at least one translation failed, it was either invalid or more likely- rejected by the server.  ' +
						'You can try the request again and if it persists try a proxy, spacing out requests, and/or using a different tld.  ' +
						'If you would like to translate other requests in a batch translation even if one fails(the failed translation will be ' +
						'set to `null`) pass the option `rejectOnPartialFail: false`.  You can also try using the singleTranslate endpoint with: `forceBatch: false`',
						{cause: {input, url, options, requestOptions}}
					);
				}
				translation = JSON.parse(translation[2]);
				const result = new TranslationResult(translation);

				if (translation[1][0][0][5] === undefined || translation[1][0][0][5] === null) {
					// translation not found, could be a hyperlink or gender-specific translation?
					result.text = translation[1][0][0][0];
				} else {
					result.text = translation[1][0][0][5]
						.map(function (obj) {
							return obj[0];
						})
						.filter(Boolean)
						// Google api seems to split text per sentences by <dot><space>
						// So we join text back with spaces.
						// See: https://github.com/vitalets/google-translate-api/issues/73
						.join(' ');
				}
				result.pronunciation = translation[1][0][0][1] ?? undefined;

				// From language
				result.from.language.didYouMean = true;
				if (translation[0] && translation[0][1] && translation[0][1][1]) {
					result.from.language.didYouMean = true;
					result.from.language.iso = translation[0][1][1][0];
				} else if (translation[1][3] === 'auto') {
					result.from.language.iso = translation[2];
				} else {
					result.from.language.iso = translation[1][3];
				}

				// Did you mean & autocorrect
				result.from.text.autoCorrected = false;
				result.from.text.didYouMean = false;
				if (translation[0] && translation[0][1] && translation[0][1][0]) {
					let str = translation[0][1][0][0][1];

					str = str.replace(/<b>(<i>)?/g, '[');
					str = str.replace(/(<\/i>)?<\/b>/g, ']');

					result.from.text.value = str;

					if (translation[0][1][0][2] === 1) {
						result.from.text.autoCorrected = true;
					} else {
						result.from.text.didYouMean = true;
					}
				}

				if (Array.isArray(input)) {
					finalResult[id] = result;
				} else if (typeof input === 'object') {
					finalResult[Object.keys(input)[id]] = result;
				} else {
					finalResult = result;
				}
			}
		}
		return finalResult;
	});
};