/**
 * Google Translate API TypeScript Declaration File
 * This file defines the types and interfaces for the Google Translate API wrapper.
 */

// Main export functions
export default translate;
export {
	translate,
	Translator,
	speak,
	singleTranslate,
	batchTranslate,
	languages,
	isSupported,
	getCode,
};

export declare namespace googleTranslateApi {
	/**
	 * Options for translation requests
	 */
	interface TranslationOptions {
		/** The `text` language. Must be `auto` or one of the codes/names (not case sensitive) contained in [languages.cjs](https://github.com/AidanWelch/google-translate-api/blob/master/lib/languages.cjs) @default "auto" */
		from?: string;
		/** The language to which the text should be translated. Must be one of the codes/names (case sensitive!) contained in [languages.cjs](https://github.com/AidanWelch/google-translate-api/blob/master/lib/languages.cjs) @default "en" */
		to?: string;
		/** Forces the translate function to use the `from` option as the ISO code, without checking the languages list @default false */
		forceFrom?: boolean;
		/** Forces the translate function to use the `to` option as the ISO code, without checking the languages list @default false */
		forceTo?: boolean;
		/** Auto corrects the inputs, and uses those corrections in the translation @default false */
		autoCorrect?: boolean;
	}

	/**
	 * Extended options for API requests
	 */
	export interface RequestOptions extends TranslationOptions {
		/** TLD for Google translate host to be used in API calls: `https://translate.google.{tld}` @default "com" */
		tld?: string;
		/** Function inputs should take `(url, requestOptions)` and mimic the response of the Fetch API with a `res.text()` and `res.json()` method @default fetch */
		requestFunction?: Function;
		/** Forces the translate function to use the batch endpoint, which is less likely to be rate limited than the single endpoint @default true */
		forceBatch?: boolean;
		/** Enables falling back to the batch endpoint if the single endpoint fails @default true */
		fallbackBatch?: boolean;
		/** The options used by the `requestFunction`. Must be in the style of [fetchinit](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch) */
		requestOptions?: object;
		/** When `true`, rejects whenever any translation in a batch fails—otherwise will just return `null` instead of that translation @default true */
		rejectOnPartialFail?: boolean;
	}

	/**
	 * Represents a translated language
	 */
	export interface TranslatedLanguage {
		/** `true` if the API suggested a correction in the source language */
		didYouMean: boolean;
		/** The [code of the language](https://github.com/AidanWelch/google-translate-api/blob/master/lib/languages.cjs) that the API has recognized in the `text` */
		iso: string;
	}

	/**
	 * Represents translated text
	 */
	export interface TranslatedText {
		/** `true` if the API has auto corrected the `text` */
		autoCorrected: boolean;
		/** The auto corrected `text` or the `text` with suggested corrections */
		value: string;
		/** `true` if the API has suggested corrections to the `text` and did not auto correct */
		didYouMean: boolean;
	}

	/**
	 * Response structure for a translation request
	 */
	export interface TranslationResponse {
		/** Translated text */
		text: string;
		/** Pronunciation guide (if available) */
		pronunciation?: string;
		from: {
			language: TranslatedLanguage;
			text: TranslatedText;
		};
		/** If `options.raw` is true, the raw response from Google Translate servers. Otherwise `''` */
		raw: string;
	}

	/**
	 * Query options for translation
	 */
	interface OptionQuery extends TranslationOptions {
		/** Text to translate */
		text: string;
	}

	// Type aliases for various input formats
	type Query = string | OptionQuery;
	export type Input = string | Query[] | { [key: string]: Query };

	/** Type for translation response based on input type */
	export type TranslationResponseStructure<T> = T extends string
		? Promise<TranslationResponse>
		: T extends Query[]
			? Promise<TranslationResponse[]>
			: Promise<{ [key in keyof T]: TranslationResponse }>;

	/** Type for speak response based on input type */
	export type SpeakResponseStructure<T> = T extends string
		? Promise<string>
		: T extends Query[]
			? Promise<string[]>
			: Promise<{ [key in keyof T]: string }>;

	/**
	 * Enum of supported languages
	 * Generated from https://translate.google.com
	 * See https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
	 */
	export const enum languages {
		"auto" = "Detect language",
		"ab" = "Abkhaz",
		"ace" = "Acehnese",
		"ach" = "Acholi",
		"aa" = "Afar",
		"af" = "Afrikaans",
		"sq" = "Albanian",
		"alz" = "Alur",
		"am" = "Amharic",
		"ar" = "Arabic",
		"hy" = "Armenian",
		"as" = "Assamese",
		"av" = "Avar",
		"awa" = "Awadhi",
		"ay" = "Aymara",
		"az" = "Azerbaijani",
		"ban" = "Balinese",
		"bal" = "Baluchi",
		"bm" = "Bambara",
		"bci" = "Baoulé",
		"ba" = "Bashkir",
		"eu" = "Basque",
		"btx" = "Batak Karo",
		"bts" = "Batak Simalungun",
		"bbc" = "Batak Toba",
		"be" = "Belarusian",
		"bem" = "Bemba",
		"bn" = "Bengali",
		"bew" = "Betawi",
		"bho" = "Bhojpuri",
		"bik" = "Bikol",
		"bs" = "Bosnian",
		"br" = "Breton",
		"bg" = "Bulgarian",
		"bua" = "Buryat",
		"yue" = "Cantonese",
		"ca" = "Catalan",
		"ceb" = "Cebuano",
		"ch" = "Chamorro",
		"ce" = "Chechen",
		"ny" = "Chichewa",
		"zh-CN" = "Chinese (Simplified)",
		"zh-TW" = "Chinese (Traditional)",
		"chk" = "Chuukese",
		"cv" = "Chuvash",
		"co" = "Corsican",
		"crh" = "Crimean Tatar (Cyrillic)",
		"crh-Latn" = "Crimean Tatar (Latin)",
		"hr" = "Croatian",
		"cs" = "Czech",
		"da" = "Danish",
		"fa-AF" = "Dari",
		"dv" = "Dhivehi",
		"din" = "Dinka",
		"doi" = "Dogri",
		"dov" = "Dombe",
		"nl" = "Dutch",
		"dyu" = "Dyula",
		"dz" = "Dzongkha",
		"en" = "English",
		"eo" = "Esperanto",
		"et" = "Estonian",
		"ee" = "Ewe",
		"fo" = "Faroese",
		"fj" = "Fijian",
		"tl" = "Filipino",
		"fi" = "Finnish",
		"fon" = "Fon",
		"fr" = "French",
		"fr-CA" = "French (Canada)",
		"fy" = "Frisian",
		"fur" = "Friulian",
		"ff" = "Fulani",
		"gaa" = "Ga",
		"gl" = "Galician",
		"ka" = "Georgian",
		"de" = "German",
		"el" = "Greek",
		"gn" = "Guarani",
		"gu" = "Gujarati",
		"ht" = "Haitian Creole",
		"cnh" = "Hakha Chin",
		"ha" = "Hausa",
		"haw" = "Hawaiian",
		"iw" = "Hebrew",
		"hil" = "Hiligaynon",
		"hi" = "Hindi",
		"hmn" = "Hmong",
		"hu" = "Hungarian",
		"hrx" = "Hunsrik",
		"iba" = "Iban",
		"is" = "Icelandic",
		"ig" = "Igbo",
		"ilo" = "Ilocano",
		"id" = "Indonesian",
		"iu-Latn" = "Inuktut (Latin)",
		"iu" = "Inuktut (Syllabics)",
		"ga" = "Irish",
		"it" = "Italian",
		"jam" = "Jamaican Patois",
		"ja" = "Japanese",
		"jw" = "Javanese",
		"kac" = "Jingpo",
		"kl" = "Kalaallisut",
		"kn" = "Kannada",
		"kr" = "Kanuri",
		"pam" = "Kapampangan",
		"kk" = "Kazakh",
		"kha" = "Khasi",
		"km" = "Khmer",
		"cgg" = "Kiga",
		"kg" = "Kikongo",
		"rw" = "Kinyarwanda",
		"ktu" = "Kituba",
		"trp" = "Kokborok",
		"kv" = "Komi",
		"gom" = "Konkani",
		"ko" = "Korean",
		"kri" = "Krio",
		"ku" = "Kurdish (Kurmanji)",
		"ckb" = "Kurdish (Sorani)",
		"ky" = "Kyrgyz",
		"lo" = "Lao",
		"ltg" = "Latgalian",
		"la" = "Latin",
		"lv" = "Latvian",
		"lij" = "Ligurian",
		"li" = "Limburgish",
		"ln" = "Lingala",
		"lt" = "Lithuanian",
		"lmo" = "Lombard",
		"lg" = "Luganda",
		"luo" = "Luo",
		"lb" = "Luxembourgish",
		"mk" = "Macedonian",
		"mad" = "Madurese",
		"mai" = "Maithili",
		"mak" = "Makassar",
		"mg" = "Malagasy",
		"ms" = "Malay",
		"ms-Arab" = "Malay (Jawi)",
		"ml" = "Malayalam",
		"mt" = "Maltese",
		"mam" = "Mam",
		"gv" = "Manx",
		"mi" = "Maori",
		"mr" = "Marathi",
		"mh" = "Marshallese",
		"mwr" = "Marwadi",
		"mfe" = "Mauritian Creole",
		"chm" = "Meadow Mari",
		"mni-Mtei" = "Meiteilon (Manipuri)",
		"min" = "Minang",
		"lus" = "Mizo",
		"mn" = "Mongolian",
		"my" = "Myanmar (Burmese)",
		"nhe" = "Nahuatl (Eastern Huasteca)",
		"ndc-ZW" = "Ndau",
		"nr" = "Ndebele (South)",
		"new" = "Nepalbhasa (Newari)",
		"ne" = "Nepali",
		"bm-Nkoo" = "NKo",
		"no" = "Norwegian",
		"nus" = "Nuer",
		"oc" = "Occitan",
		"or" = "Odia (Oriya)",
		"om" = "Oromo",
		"os" = "Ossetian",
		"pag" = "Pangasinan",
		"pap" = "Papiamento",
		"ps" = "Pashto",
		"fa" = "Persian",
		"pl" = "Polish",
		"pt" = "Portuguese (Brazil)",
		"pt-PT" = "Portuguese (Portugal)",
		"pa" = "Punjabi (Gurmukhi)",
		"pa-Arab" = "Punjabi (Shahmukhi)",
		"qu" = "Quechua",
		"kek" = "Qʼeqchiʼ",
		"rom" = "Romani",
		"ro" = "Romanian",
		"rn" = "Rundi",
		"ru" = "Russian",
		"se" = "Sami (North)",
		"sm" = "Samoan",
		"sg" = "Sango",
		"sa" = "Sanskrit",
		"sat-Latn" = "Santali (Latin)",
		"sat" = "Santali (Ol Chiki)",
		"gd" = "Scots Gaelic",
		"nso" = "Sepedi",
		"sr" = "Serbian",
		"st" = "Sesotho",
		"crs" = "Seychellois Creole",
		"shn" = "Shan",
		"sn" = "Shona",
		"scn" = "Sicilian",
		"szl" = "Silesian",
		"sd" = "Sindhi",
		"si" = "Sinhala",
		"sk" = "Slovak",
		"sl" = "Slovenian",
		"so" = "Somali",
		"es" = "Spanish",
		"su" = "Sundanese",
		"sus" = "Susu",
		"sw" = "Swahili",
		"ss" = "Swati",
		"sv" = "Swedish",
		"ty" = "Tahitian",
		"tg" = "Tajik",
		"ber-Latn" = "Tamazight",
		"ber" = "Tamazight (Tifinagh)",
		"ta" = "Tamil",
		"tt" = "Tatar",
		"te" = "Telugu",
		"tet" = "Tetum",
		"th" = "Thai",
		"bo" = "Tibetan",
		"ti" = "Tigrinya",
		"tiv" = "Tiv",
		"tpi" = "Tok Pisin",
		"to" = "Tongan",
		"lua" = "Tshiluba",
		"ts" = "Tsonga",
		"tn" = "Tswana",
		"tcy" = "Tulu",
		"tum" = "Tumbuka",
		"tr" = "Turkish",
		"tk" = "Turkmen",
		"tyv" = "Tuvan",
		"ak" = "Twi",
		"udm" = "Udmurt",
		"uk" = "Ukrainian",
		"ur" = "Urdu",
		"ug" = "Uyghur",
		"uz" = "Uzbek",
		"ve" = "Venda",
		"vec" = "Venetian",
		"vi" = "Vietnamese",
		"war" = "Waray",
		"cy" = "Welsh",
		"wo" = "Wolof",
		"xh" = "Xhosa",
		"sah" = "Yakut",
		"yi" = "Yiddish",
		"yo" = "Yoruba",
		"yua" = "Yucatec Maya",
		"zap" = "Zapotec",
		"zu" = "Zulu",
	}
}

/**
 * Main translation function
 * @param input - Text, array, or object of texts to translate
 * @param opts - Translation options
 * @returns Promise resolving to translation response(s)
 */
declare function translate<Input extends googleTranslateApi.Input>(
	input: Input,
	opts?: googleTranslateApi.RequestOptions,
): googleTranslateApi.TranslationResponseStructure<Input>;

/**
 * Translator class for creating reusable translator instances
 */
declare class Translator {
	constructor(options?: googleTranslateApi.RequestOptions);
	translate<Input extends googleTranslateApi.Input>(
		input: Input,
		opts?: googleTranslateApi.RequestOptions,
	): googleTranslateApi.TranslationResponseStructure<Input>;
	options: googleTranslateApi.RequestOptions;
}

/**
 * Function to get spoken audio of translated text
 * @param input - Text, array, or object of texts to speak
 * @param opts - Translation options, the `to` field is used for the language spoken in
 * @returns Promise resolving to Base64 string(s) encoding mp3 audio
 */
declare function speak<Input extends googleTranslateApi.Input>(
	input: Input,
	opts?: googleTranslateApi.RequestOptions,
): googleTranslateApi.SpeakResponseStructure<Input>;

/**
 * Function to translate a single string
 * @param input - Text to translate
 * @param opts - Translation options
 * @returns Promise resolving to translation response
 */
declare function singleTranslate(
	input: string,
	opts?: googleTranslateApi.RequestOptions,
): googleTranslateApi.TranslationResponseStructure<string>;

/**
 * Bypass any single translate options and forces batch translation
 */
declare const batchTranslate: typeof translate;

/**
 * Object containing supported languages
 */
declare enum languages {
	"auto" = "Detect language",
	"ab" = "Abkhaz",
	"ace" = "Acehnese",
	"ach" = "Acholi",
	"aa" = "Afar",
	"af" = "Afrikaans",
	"sq" = "Albanian",
	"alz" = "Alur",
	"am" = "Amharic",
	"ar" = "Arabic",
	"hy" = "Armenian",
	"as" = "Assamese",
	"av" = "Avar",
	"awa" = "Awadhi",
	"ay" = "Aymara",
	"az" = "Azerbaijani",
	"ban" = "Balinese",
	"bal" = "Baluchi",
	"bm" = "Bambara",
	"bci" = "Baoulé",
	"ba" = "Bashkir",
	"eu" = "Basque",
	"btx" = "Batak Karo",
	"bts" = "Batak Simalungun",
	"bbc" = "Batak Toba",
	"be" = "Belarusian",
	"bem" = "Bemba",
	"bn" = "Bengali",
	"bew" = "Betawi",
	"bho" = "Bhojpuri",
	"bik" = "Bikol",
	"bs" = "Bosnian",
	"br" = "Breton",
	"bg" = "Bulgarian",
	"bua" = "Buryat",
	"yue" = "Cantonese",
	"ca" = "Catalan",
	"ceb" = "Cebuano",
	"ch" = "Chamorro",
	"ce" = "Chechen",
	"ny" = "Chichewa",
	"zh-CN" = "Chinese (Simplified)",
	"zh-TW" = "Chinese (Traditional)",
	"chk" = "Chuukese",
	"cv" = "Chuvash",
	"co" = "Corsican",
	"crh" = "Crimean Tatar (Cyrillic)",
	"crh-Latn" = "Crimean Tatar (Latin)",
	"hr" = "Croatian",
	"cs" = "Czech",
	"da" = "Danish",
	"fa-AF" = "Dari",
	"dv" = "Dhivehi",
	"din" = "Dinka",
	"doi" = "Dogri",
	"dov" = "Dombe",
	"nl" = "Dutch",
	"dyu" = "Dyula",
	"dz" = "Dzongkha",
	"en" = "English",
	"eo" = "Esperanto",
	"et" = "Estonian",
	"ee" = "Ewe",
	"fo" = "Faroese",
	"fj" = "Fijian",
	"tl" = "Filipino",
	"fi" = "Finnish",
	"fon" = "Fon",
	"fr" = "French",
	"fr-CA" = "French (Canada)",
	"fy" = "Frisian",
	"fur" = "Friulian",
	"ff" = "Fulani",
	"gaa" = "Ga",
	"gl" = "Galician",
	"ka" = "Georgian",
	"de" = "German",
	"el" = "Greek",
	"gn" = "Guarani",
	"gu" = "Gujarati",
	"ht" = "Haitian Creole",
	"cnh" = "Hakha Chin",
	"ha" = "Hausa",
	"haw" = "Hawaiian",
	"iw" = "Hebrew",
	"hil" = "Hiligaynon",
	"hi" = "Hindi",
	"hmn" = "Hmong",
	"hu" = "Hungarian",
	"hrx" = "Hunsrik",
	"iba" = "Iban",
	"is" = "Icelandic",
	"ig" = "Igbo",
	"ilo" = "Ilocano",
	"id" = "Indonesian",
	"iu-Latn" = "Inuktut (Latin)",
	"iu" = "Inuktut (Syllabics)",
	"ga" = "Irish",
	"it" = "Italian",
	"jam" = "Jamaican Patois",
	"ja" = "Japanese",
	"jw" = "Javanese",
	"kac" = "Jingpo",
	"kl" = "Kalaallisut",
	"kn" = "Kannada",
	"kr" = "Kanuri",
	"pam" = "Kapampangan",
	"kk" = "Kazakh",
	"kha" = "Khasi",
	"km" = "Khmer",
	"cgg" = "Kiga",
	"kg" = "Kikongo",
	"rw" = "Kinyarwanda",
	"ktu" = "Kituba",
	"trp" = "Kokborok",
	"kv" = "Komi",
	"gom" = "Konkani",
	"ko" = "Korean",
	"kri" = "Krio",
	"ku" = "Kurdish (Kurmanji)",
	"ckb" = "Kurdish (Sorani)",
	"ky" = "Kyrgyz",
	"lo" = "Lao",
	"ltg" = "Latgalian",
	"la" = "Latin",
	"lv" = "Latvian",
	"lij" = "Ligurian",
	"li" = "Limburgish",
	"ln" = "Lingala",
	"lt" = "Lithuanian",
	"lmo" = "Lombard",
	"lg" = "Luganda",
	"luo" = "Luo",
	"lb" = "Luxembourgish",
	"mk" = "Macedonian",
	"mad" = "Madurese",
	"mai" = "Maithili",
	"mak" = "Makassar",
	"mg" = "Malagasy",
	"ms" = "Malay",
	"ms-Arab" = "Malay (Jawi)",
	"ml" = "Malayalam",
	"mt" = "Maltese",
	"mam" = "Mam",
	"gv" = "Manx",
	"mi" = "Maori",
	"mr" = "Marathi",
	"mh" = "Marshallese",
	"mwr" = "Marwadi",
	"mfe" = "Mauritian Creole",
	"chm" = "Meadow Mari",
	"mni-Mtei" = "Meiteilon (Manipuri)",
	"min" = "Minang",
	"lus" = "Mizo",
	"mn" = "Mongolian",
	"my" = "Myanmar (Burmese)",
	"nhe" = "Nahuatl (Eastern Huasteca)",
	"ndc-ZW" = "Ndau",
	"nr" = "Ndebele (South)",
	"new" = "Nepalbhasa (Newari)",
	"ne" = "Nepali",
	"bm-Nkoo" = "NKo",
	"no" = "Norwegian",
	"nus" = "Nuer",
	"oc" = "Occitan",
	"or" = "Odia (Oriya)",
	"om" = "Oromo",
	"os" = "Ossetian",
	"pag" = "Pangasinan",
	"pap" = "Papiamento",
	"ps" = "Pashto",
	"fa" = "Persian",
	"pl" = "Polish",
	"pt" = "Portuguese (Brazil)",
	"pt-PT" = "Portuguese (Portugal)",
	"pa" = "Punjabi (Gurmukhi)",
	"pa-Arab" = "Punjabi (Shahmukhi)",
	"qu" = "Quechua",
	"kek" = "Qʼeqchiʼ",
	"rom" = "Romani",
	"ro" = "Romanian",
	"rn" = "Rundi",
	"ru" = "Russian",
	"se" = "Sami (North)",
	"sm" = "Samoan",
	"sg" = "Sango",
	"sa" = "Sanskrit",
	"sat-Latn" = "Santali (Latin)",
	"sat" = "Santali (Ol Chiki)",
	"gd" = "Scots Gaelic",
	"nso" = "Sepedi",
	"sr" = "Serbian",
	"st" = "Sesotho",
	"crs" = "Seychellois Creole",
	"shn" = "Shan",
	"sn" = "Shona",
	"scn" = "Sicilian",
	"szl" = "Silesian",
	"sd" = "Sindhi",
	"si" = "Sinhala",
	"sk" = "Slovak",
	"sl" = "Slovenian",
	"so" = "Somali",
	"es" = "Spanish",
	"su" = "Sundanese",
	"sus" = "Susu",
	"sw" = "Swahili",
	"ss" = "Swati",
	"sv" = "Swedish",
	"ty" = "Tahitian",
	"tg" = "Tajik",
	"ber-Latn" = "Tamazight",
	"ber" = "Tamazight (Tifinagh)",
	"ta" = "Tamil",
	"tt" = "Tatar",
	"te" = "Telugu",
	"tet" = "Tetum",
	"th" = "Thai",
	"bo" = "Tibetan",
	"ti" = "Tigrinya",
	"tiv" = "Tiv",
	"tpi" = "Tok Pisin",
	"to" = "Tongan",
	"lua" = "Tshiluba",
	"ts" = "Tsonga",
	"tn" = "Tswana",
	"tcy" = "Tulu",
	"tum" = "Tumbuka",
	"tr" = "Turkish",
	"tk" = "Turkmen",
	"tyv" = "Tuvan",
	"ak" = "Twi",
	"udm" = "Udmurt",
	"uk" = "Ukrainian",
	"ur" = "Urdu",
	"ug" = "Uyghur",
	"uz" = "Uzbek",
	"ve" = "Venda",
	"vec" = "Venetian",
	"vi" = "Vietnamese",
	"war" = "Waray",
	"cy" = "Welsh",
	"wo" = "Wolof",
	"xh" = "Xhosa",
	"sah" = "Yakut",
	"yi" = "Yiddish",
	"yo" = "Yoruba",
	"yua" = "Yucatec Maya",
	"zap" = "Zapotec",
	"zu" = "Zulu",
}

/**
 * Returns true if the desiredLang is supported by Google Translate and false otherwise
 * @param desiredLang – the ISO 639-1 code or the name of the desired language
 * @returns True if supported, false otherwise
 */
declare function isSupported(desiredLang: string): boolean;

/**
 * Returns the ISO 639-1 code of the desiredLang – if it is supported by Google Translate
 * @param desiredLang – the name or the code (case sensitive) of the desired language
 * @returns The ISO 639-1 code of the language or null if the language is not supported
 */
declare function getCode(desiredLang: string): string | null;
