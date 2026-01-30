# google-translate-api-x
[![Actions Status](https://github.com/AidanWelch/google-translate-api/workflows/autotests/badge.svg)](https://github.com/AidanWelch/google-translate-api/actions)
[![NPM version](https://img.shields.io/npm/v/google-translate-api-x.svg)](https://www.npmjs.com/package/google-translate-api-x)

A **free** and **unlimited** API for Google Translate :dollar: :no_entry_sign: written with compatibility in mind, made to be crossplatform.
Now with over 100 new languages supported!

## Features 

- Up-to-Date with all new Google Translate supported languages!
- Auto language detection
- Spelling correction
- Language correction 
- Fast and reliable – it uses the same servers that [translate.google.com](https://translate.google.com) uses
- Wide compatibility through supporting Fetch and custom request functions
- Batch many translations into one request with arrays or objects!
- Supports the single and batch translate endpoints
- Has both a translate method, and a Translator class which preserves options
- Text-to-Speech from the Google Translate API using the `speak` method

## Why this fork?
This fork of [vitalets/google-translate-api](https://github.com/vitalets/google-translate-api) contains several improvements with the primary change being it is written to support both the batch and single Google Translate endpoints, as well as any input request function.  Additionally, there is optional language checking, and a list of supported languages that can best used.  Many similar packages of the same endpoints either only use the single translate endpoint, which is quickly rate limited, or the batch translate endpoint which is sometimes innaccurate.

## Install 

```
npm install google-translate-api-x
```

## Usage

From automatic language detection to English:

```js
const translate = require('google-translate-api-x');
// Or of course
import translate from 'google-translate-api-x';
// Or deconstruct all the exposed variables as
import { translate, Translator, speak, singleTranslate, batchTranslate, languages, isSupported, getCode } from 'google-translate-api-x';
// or again
const { translate, Translator, speak, singleTranslate, batchTranslate, languages, isSupported, getCode } = require('google-translate-api-x');

const res = await translate('Ik spreek Engels', {to: 'en'});

console.log(res.text); //=> I speak English
console.log(res.from.language.iso);  //=> nl
```

If server returns **Response code 403 (Forbidden)** try set option `client=gtx`:
```js
const res = await translate('Ik spreek Engels', { to: 'en', client: 'gtx' }).then(res => { ... });
```

> Please note that maximum text length for translation call is **5000** characters. 
> In case of longer text you should split it on chunks, see [#20](https://github.com/vitalets/google-translate-api/issues/20).

## Autocorrect
From English to Dutch with a typo (autoCorrect):

```js
const res = await translate('I spea Dutch!', { from: 'en', to: 'nl', autoCorrect: true });

console.log(res.from.text.didYouMean); // => false
console.log(res.from.text.autoCorrected); // => true
console.log(res.from.text.value); // => 'I [speak] Dutch!'

console.log(res.text); // => 'Ik spreek Nederlands!'
```

These reported values are often inaccurate and cannot be relied upon

## Text-to-Speech (TTS)
A TTS request is made just like a translate request but using the speak method.  The language spoken is the `to` language in options(or query params).
The response is just a Base64 MP3 as a string.
```js
import { speak } from 'google-translate-api-x';
import { writeFileSync } from 'fs';

const res = await speak('gata', {to: 'es'}); // => Base64 encoded mp3
writeFileSync('cat.mp3', res, {encoding:'base64'}); // Saves the mp3 to file
```

## Single and Batch Endpoints

### Single translate

The single translate endpoint is generally more accurate- and I suspect is a more advanced translation engine.  Noticably it is more accurate(but still not completely accurate) when it comes to gendered words.
Using the more accurate single translate endpoint requires setting forceBatch to false:
```js
const res = await translate('cat', {to: 'es', forceBatch: false});

console.log(res.test); // => 'gato' instead of 'gata' which batch would return
```
And to guarantee it is used you can also pass `fallbackBatch: false`.

⚠️**However, the single translate endpoint is much more likely to be ratelimited and have your request rejected than the batch translate endpoint!**

### Batch translate

Because of the risk of being ratelimited- the default endpoint and fallback endpoint for this package is the batch translate endpoint.  It notably supports multiple queries in one request- so batch requests always go through the batch endpoint.

## Persistent Options with Translator class
```js
import { Translator } from 'google-translate-api-x';
const translator = new Translator({from: 'en', to: 'es', forceBatch: false, tld: 'es'});
const cat = await translator.translate('cat');
const dog = await translator.translate('dog');
const birds = await translator.translate(['owl', 'hawk']);

console.log(cat.text); // => 'gato'
console.log(dog.text); // => 'perro'
console.log([birds[0].text, birds[1].text]); // => '[ 'búho', 'halcón' ]'
```

## Did you mean
Even with autocorrect disabled Google Translate will still attempt to correct errors, but will not use the correction for translation.  However, it will update `res.from.text.value` with the corrected text:

```js
const res = await translate('I spea Dutch!', { from: 'en', to: 'nl', autoCorrect: false });

console.log(res.from.text.didYouMean); // => true
console.log(res.from.text.autoCorrected); // => false
console.log(res.from.text.value); // => 'I [speak] Dutch!'

console.log(res.text); // => 'Ik speed Nederlands!'
```

## Array and Object inputs (Batch Requests)
An array or object of inputs can be used to slightly lower the number of individual API calls:

```js
const inputArray = [
  'I speak Dutch!',
  'Dutch is fun!',
  'And so is translating!'
];

const res = await translate(inputArray, { from: 'en', to: 'nl' });

console.log(res[0].text); // => 'Ik spreek Nederlands!'
console.log(res[1].text); // => 'Nederlands is leuk!'
console.log(res[2].text); // => 'En zo ook vertalen!'
```

and similarly with an object:

```js
const inputObject = {
  name: 'Aidan Welch',
  fact: 'I\'m maintaining this project',
  birthMonth: 'February'
};

const res = await translate(inputObject, { from: 'en', to: 'ja' });

console.log(res.name.text); // => 'エイダンウェルチ'
console.log(res.fact.text); // => '私はこのプロジェクトを維持しています'
console.log(res.birthMonth.text); // => '2月'
```

If you use `auto` each input can even be in a different language!

### Batch Request with Different Options (Option Query)

In Array and Object requests you can specify `from`, `to`, `forceFrom`, `forceTo`, and `autoCorrect` for each individual string to be translated by passing an object with the options set and the string as the text property.  Like so:

```js
const inputArray = [
  'I speak Dutch!',
  {text: 'I speak Japanese!', to: 'ja'},
  {text: '¡Hablo checo!', from: 'es', to: 'cs', forceTo: true, autoCorrect: true}
];

const res = await translate(inputArray, { from: 'en', to: 'nl' });

console.log(res[0].text); // => 'Ik spreek Nederlands!'
console.log(res[1].text); // => '私は日本語を話します！'
console.log(res[2].text); // => 'Mluvím česky!'
```

⚠️ You cannot pass a single translation by itself as an option query, it must either be passed as a string and use the options parameter, or passed wrapped by another array or object.  This the translate function cannot differentiate between a batch query object and an option query object. 

## Using languages not supported in languages.js yet
If you know the ISO code used by Google Translate for a language and know it is supported but this API doesn't support it yet you can force it like so:

```js
const res = await translate('Hello!', { from: 'en', to: 'as', forceTo: true });

console.log(res.text); // => 'নমস্কাৰ!'
```

`forceFrom` can be used in the same way.

You can also add languages in the code and use them in the translation:
``` js
translate = require('google-translate-api-x');
translate.languages['sr-Latn'] = 'Serbian Latin';

translate('translator', {to: 'sr-Latn'}).then(res => ...);
```

## Proxy
Google Translate has request limits(supposedly for batch- and definitely for single translate). If too many requests are made, you can either end up with a 429 or a 503 error.
You can use **proxy** to bypass them, the best way is to pass a proxy agent to fetch through requestOptions:
```
npm install https-proxy-agent
```

```js
import HttpsProxyAgent from require('https-proxy-agent');
translate('Ik spreek Engels', {to: 'en', requestOptions: {
    agent: new HttpsProxyAgent('proxy-url-here');
  }
}).then(res => {
    // do something
});
```

## Does it work from web page context?
It can, sort of. `https://translate.google.com` does not provide [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) http headers allowing access from other domains.  However, this fork is written using Fetch and/or Axios, allowing contexts that don't request CORS access, such as a browser extension background script or React Native.


## API

### translate(input, options)

#### input

Type: `string` | `string[]` | `{[key]: string}` | `{text: string, ...options}[]` | `{ [key]: {text: string, ...options} }`

The text to be translated, with optionally specific options for that text

### Returns an `object` | `object[]` | `{[key]: object}`}:
Matches the structure of the input, so returns just the individual object if just a string is input, an array if an array is input, object with the same keys if an object is input.  Regardless of that, each returned value will have this schema:
- `text` *(string)* – The translated text.
- `pronunciation` *(string)* | *(undefined)* – Pronunciation guide (if available)
- `from` *(object)*
  - `language` *(object)*
    - `didYouMean` *(boolean)* - `true` if the API suggest a correction in the source language
    - `iso` *(string)* - The [code of the language](https://github.com/AidanWelch/google-translate-api/blob/master/lib/languages.cjs) that the API has recognized in the `text`
  - `text` *(object)*
    - `autoCorrected` *(boolean)* – `true` if the API has auto corrected the `text`
    - `value` *(string)* – The auto corrected `text` or the `text` with suggested corrections
    - `didYouMean` *(boolean)* – `true` if the API has suggested corrections to the `text` and did not autoCorrect
- `raw` *(string)* - If `options.raw` is true, the raw response from Google Translate servers. Otherwise, `''`.

Note that `res.from.text` will only be returned if `from.text.autoCorrected` or `from.text.didYouMean` equals to `true`. In this case, it will have the corrections delimited with brackets (`[ ]`):

```js
translate('I spea Dutch').then(res => {
    console.log(res.from.text.value);
    //=> I [speak] Dutch
}).catch(err => {
    console.error(err);
});
```
Otherwise, it will be an empty `string` (`''`).

### speak(input, options)

#### input

Type: `string` | `string[]` | `{[key]: string}` | `{text: string, ...options}[]` | `{ [key]: {text: string, ...options} }`

The text to be spoken, with optionally specific options for that text.

The `to` field of options is used for the language spoken in

### Returns a `string` | `string[]` | `{[key]: string}`}:
The returned string is a Base64 encoded mp3.

### Translator(options)

### Returns a `translator`:
An object with these options as the default, that you can call the translate method on.

### options

Type: `object`

#### from
Type: `string` Default: `auto`

The `text` language. Must be `auto` or one of the codes/names (not case sensitive) contained in [languages.cjs](https://github.com/AidanWelch/google-translate-api/blob/master/lib/languages.cjs).

#### to
Type: `string` Default: `en`

The language in which the text should be translated. Must be one of the codes/names (case sensitive!) contained in [languages.cjs](https://github.com/AidanWelch/google-translate-api/blob/master/lib/languages.cjs).

#### forceFrom
Type: `boolean` Default: `false`

Forces the translate function to use the `from` option as the iso code, without checking the languages list.

#### forceTo
Type: `boolean` Default: `false`

Forces the translate function to use the `to` option as the iso code, without checking the languages list.

#### forceBatch
Type: `boolean` Default: `true`

Forces the translate function to use the batch endpoint, which is less likely to be rate limited than the single endpoint.

#### fallbackBatch
type: `boolean` Default: `true`

Enables falling back to the batch endpoint if the single endpoint fails.

#### autoCorrect
Type: `boolean` Default: `false`

Autocorrects the inputs, and uses those corrections in the translation.

#### rejectOnPartialFail
Type: `boolean` Default: `true`

When true rejects whenever any translation in a batch fails- otherwise will just return `null` instead of that translation.

#### raw
Type: `boolean` Default: `false`

If `true`, the returned object will have a `raw` property with the raw response (`string`) from Google Translate.

#### requestFunction
Type: `function` Default: `fetch`

Function inputs should take `(url, requestOptions)` and mimick the response of the Fetch API with a `res.text()` and `res.json()` method.

#### client
Type: `string` Default: `"t"`

Query parameter `client` used in API calls. Can be `t|gtx`.

#### tld
Type: `string` Default: `"com"`

TLD for Google translate host to be used in API calls: `https://translate.google.{tld}`.

#### requestOptions
Type: `object`

The options used by the requestFunction.  Must be in the style of [fetchinit](https://developer.mozilla.org/en-US/docs/Web/API/fetch).


## Related projects
* [Translateer](https://github.com/Songkeys/Translateer) - uses Puppeteer to access Google Translate API.

## License

MIT © [Matheus Fernandes](http://matheus.top), forked and maintained by [Aidan Welch](https://github.com/AidanWelch).
