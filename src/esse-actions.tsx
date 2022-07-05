import { Clipboard, List, ActionPanel, Action, Icon } from "@raycast/api";
import { execFile } from "child_process";
import { useEffect, useState } from "react";

interface EsseItem {
	match: string;
	title: string;
	uid: string;
	subtitle: string;
	arg: string;
	autocomplete: string;
}

const ESSE_ITEMS: EsseItem[] = [
	{
		match: "Base64 ",
		title: "Base64",
		uid: "co.ameba.Esse.ConvertFunctions.base64",
		subtitle: "",
		arg: "co.ameba.Esse.ConvertFunctions.base64",
		autocomplete: "Base64",
	},
	{
		match: "CJK Quotes Replace all quotes with CJK Brackets",
		title: "CJK Quotes",
		uid: "co.ameba.Esse.QuotationMarksFunctions.CJKQuotes",
		subtitle: "Replace all quotes with CJK Brackets",
		arg: "co.ameba.Esse.QuotationMarksFunctions.CJKQuotes",
		autocomplete: "CJK Quotes",
	},
	{
		match: "Camel Case Transforms by concatenating capitalized words but first character is lowercased",
		title: "Camel Case",
		uid: "co.ameba.Esse.CaseFunctions.camelCase",
		subtitle: "Transforms by concatenating capitalized words but first character is lowercased",
		arg: "co.ameba.Esse.CaseFunctions.camelCase",
		autocomplete: "Camel Case",
	},
	{
		match:
			"Capitalize Words Replace the first character in each word changed to its corresponding uppercase value, and all remaining characters set to their corresponding lowercase values.",
		title: "Capitalize Words",
		uid: "co.ameba.Esse.CaseFunctions.capitaliseWords",
		subtitle:
			"Replace the first character in each word changed to its corresponding uppercase value, and all remaining characters set to their corresponding lowercase values.",
		arg: "co.ameba.Esse.CaseFunctions.capitaliseWords",
		autocomplete: "Capitalize Words",
	},
	{
		match: "Chicago Manual of Style Do Not Capitalize Words Based on Length",
		title: "Chicago Manual of Style",
		uid: "co.ameba.Esse.CaseFunctions.chmosCase",
		subtitle: "Do Not Capitalize Words Based on Length",
		arg: "co.ameba.Esse.CaseFunctions.chmosCase",
		autocomplete: "Chicago Manual of Style",
	},
	{
		match: "Circle Letters: Empty All letters are placed in ⓔⓜⓟⓣⓨ circles",
		title: "Circle Letters: Empty",
		uid: "co.ameba.Esse.OtherFunctions.circleLetters",
		subtitle: "All letters are placed in ⓔⓜⓟⓣⓨ circles",
		arg: "co.ameba.Esse.OtherFunctions.circleLetters",
		autocomplete: "Circle Letters: Empty",
	},
	{
		match: "Circle Letters: Filled All letters are placed in filled circles",
		title: "Circle Letters: Filled",
		uid: "co.ameba.Esse.OtherFunctions.circleLettersFilled",
		subtitle: "All letters are placed in filled circles",
		arg: "co.ameba.Esse.OtherFunctions.circleLettersFilled",
		autocomplete: "Circle Letters: Filled",
	},
	{
		match: "Count Unique Words Counts unique words",
		title: "Count Unique Words",
		uid: "co.ameba.Esse.OtherFunctions.uniqueWords",
		subtitle: "Counts unique words",
		arg: "co.ameba.Esse.OtherFunctions.uniqueWords",
		autocomplete: "Count Unique Words",
	},
	{
		match: "Cowsay Cow says whatever you want! Non-monospaced font, may look odd...",
		title: "Cowsay",
		uid: "co.ameba.Esse.ASCIIFunctions.ASCIICowSay",
		subtitle: "Cow says whatever you want! Non-monospaced font, may look odd...",
		arg: "co.ameba.Esse.ASCIIFunctions.ASCIICowSay",
		autocomplete: "Cowsay",
	},
	{
		match: "Curly Quotes Replace all quotes with Curly(Citation) quotes",
		title: "Curly Quotes",
		uid: "co.ameba.Esse.QuotationMarksFunctions.angleQuotes",
		subtitle: "Replace all quotes with Curly(Citation) quotes",
		arg: "co.ameba.Esse.QuotationMarksFunctions.angleQuotes",
		autocomplete: "Curly Quotes",
	},
	{
		match: "Decrease Indent Removes tab in the beginning of each line, decreasing indentation",
		title: "Decrease Indent",
		uid: "co.ameba.Esse.ConvertFunctions.decreaseIndent",
		subtitle: "Removes tab in the beginning of each line, decreasing indentation",
		arg: "co.ameba.Esse.ConvertFunctions.decreaseIndent",
		autocomplete: "Decrease Indent",
	},
	{
		match: "Double to Single Quotes Replace all double quotes with single quotes",
		title: "Double to Single Quotes",
		uid: "co.ameba.Esse.QuotationMarksFunctions.doubleToSingleQuotes",
		subtitle: "Replace all double quotes with single quotes",
		arg: "co.ameba.Esse.QuotationMarksFunctions.doubleToSingleQuotes",
		autocomplete: "Double to Single Quotes",
	},
	{
		match: "Extract Address Extracts addresses from given text, outputs one date per line.",
		title: "Extract Address",
		uid: "co.ameba.Esse.ExtractFunctions.extractAddress",
		subtitle: "Extracts addresses from given text, outputs one date per line.",
		arg: "co.ameba.Esse.ExtractFunctions.extractAddress",
		autocomplete: "Extract Address",
	},
	{
		match: "Extract Dates Extracts dates from given text, outputs one date per line.",
		title: "Extract Dates",
		uid: "co.ameba.Esse.ExtractFunctions.extractDate",
		subtitle: "Extracts dates from given text, outputs one date per line.",
		arg: "co.ameba.Esse.ExtractFunctions.extractDate",
		autocomplete: "Extract Dates",
	},
	{
		match: "Extract Emails Extracts emails from given text, outputs one email per line.",
		title: "Extract Emails",
		uid: "co.ameba.Esse.ExtractFunctions.extractEmail",
		subtitle: "Extracts emails from given text, outputs one email per line.",
		arg: "co.ameba.Esse.ExtractFunctions.extractEmail",
		autocomplete: "Extract Emails",
	},
	{
		match: "Extract Phone Numbers Extracts phone numbers from given text, outputs one phone per line.",
		title: "Extract Phone Numbers",
		uid: "co.ameba.Esse.ExtractFunctions.extractPhone",
		subtitle: "Extracts phone numbers from given text, outputs one phone per line.",
		arg: "co.ameba.Esse.ExtractFunctions.extractPhone",
		autocomplete: "Extract Phone Numbers",
	},
	{
		match: "Extract URLs Extracts URLs from given text, outputs one URL per line.",
		title: "Extract URLs",
		uid: "co.ameba.Esse.ExtractFunctions.extractURL",
		subtitle: "Extracts URLs from given text, outputs one URL per line.",
		arg: "co.ameba.Esse.ExtractFunctions.extractURL",
		autocomplete: "Extract URLs",
	},
	{
		match: "Guillemet Quotes Replace all quotes with Guillemet(Angle) quotes",
		title: "Guillemet Quotes",
		uid: "co.ameba.Esse.QuotationMarksFunctions.curvedQuotes",
		subtitle: "Replace all quotes with Guillemet(Angle) quotes",
		arg: "co.ameba.Esse.QuotationMarksFunctions.curvedQuotes",
		autocomplete: "Guillemet Quotes",
	},
	{
		match: "HTML to Plain Text Converts provided HTML code to plain text",
		title: "HTML to Plain Text",
		uid: "co.ameba.Esse.ConvertFunctions.htmlToPlainText",
		subtitle: "Converts provided HTML code to plain text",
		arg: "co.ameba.Esse.ConvertFunctions.htmlToPlainText",
		autocomplete: "HTML to Plain Text",
	},
	{
		match: "Hashtags Adds hash sign(#) to each word.",
		title: "Hashtags",
		uid: "co.ameba.Esse.OtherFunctions.hashTag",
		subtitle: "Adds hash sign(#) to each word.",
		arg: "co.ameba.Esse.OtherFunctions.hashTag",
		autocomplete: "Hashtags",
	},
	{
		match: "Increase Indent Adds tab in the beginning of each line, increasing indentation",
		title: "Increase Indent",
		uid: "co.ameba.Esse.ConvertFunctions.increaseIndent",
		subtitle: "Adds tab in the beginning of each line, increasing indentation",
		arg: "co.ameba.Esse.ConvertFunctions.increaseIndent",
		autocomplete: "Increase Indent",
	},
	{
		match: "Kebab Case Transforms by separating words with dash symbol (-) instead of a space",
		title: "Kebab Case",
		uid: "co.ameba.Esse.CaseFunctions.kebabCase",
		subtitle: "Transforms by separating words with dash symbol (-) instead of a space",
		arg: "co.ameba.Esse.CaseFunctions.kebabCase",
		autocomplete: "Kebab Case",
	},
	{
		match: "List: Add Line Bullet (*) Adds star(*) to each line",
		title: "List: Add Line Bullet (*)",
		uid: "co.ameba.Esse.OtherFunctions.addLineBulletStar",
		subtitle: "Adds star(*) to each line",
		arg: "co.ameba.Esse.OtherFunctions.addLineBulletStar",
		autocomplete: "List: Add Line Bullet (*)",
	},
	{
		match: "List: Add Line Bullet (-) Adds dash(-) to each line",
		title: "List: Add Line Bullet (-)",
		uid: "co.ameba.Esse.OtherFunctions.addLineBulletDash",
		subtitle: "Adds dash(-) to each line",
		arg: "co.ameba.Esse.OtherFunctions.addLineBulletDash",
		autocomplete: "List: Add Line Bullet (-)",
	},
	{
		match: "List: Add Line Numbers (1 2 3) Numbers each line",
		title: "List: Add Line Numbers (1 2 3)",
		uid: "co.ameba.Esse.OtherFunctions.addLineNumbers",
		subtitle: "Numbers each line",
		arg: "co.ameba.Esse.OtherFunctions.addLineNumbers",
		autocomplete: "List: Add Line Numbers (1 2 3)",
	},
	{
		match: "List: Add Line Numbers (1) 2) 3)) Numbers each line, numbers followed by parentheses",
		title: "List: Add Line Numbers (1) 2) 3))",
		uid: "co.ameba.Esse.OtherFunctions.addLineNumbersParentheses",
		subtitle: "Numbers each line, numbers followed by parentheses",
		arg: "co.ameba.Esse.OtherFunctions.addLineNumbersParentheses",
		autocomplete: "List: Add Line Numbers (1) 2) 3))",
	},
	{
		match: "List: Add Line Numbers (1. 2. 3.) Numbers each line, numbers followed by dot",
		title: "List: Add Line Numbers (1. 2. 3.)",
		uid: "co.ameba.Esse.OtherFunctions.addLineNumbersDot",
		subtitle: "Numbers each line, numbers followed by dot",
		arg: "co.ameba.Esse.OtherFunctions.addLineNumbersDot",
		autocomplete: "List: Add Line Numbers (1. 2. 3.)",
	},
	{
		match: "Lowercase Returns a version of the text with all letters converted to lowercase",
		title: "Lowercase",
		uid: "co.ameba.Esse.CaseFunctions.lowerCase",
		subtitle: "Returns a version of the text with all letters converted to lowercase",
		arg: "co.ameba.Esse.CaseFunctions.lowerCase",
		autocomplete: "Lowercase",
	},
	{
		match: "MD5 ",
		title: "MD5",
		uid: "co.ameba.Esse.ConvertFunctions.md5",
		subtitle: "",
		arg: "co.ameba.Esse.ConvertFunctions.md5",
		autocomplete: "MD5",
	},
	{
		match: "Minify JSON Returns a minimized version of JSON, everething is in one string",
		title: "Minify JSON",
		uid: "co.ameba.Esse.OtherFunctions.minifyJSON",
		subtitle: "Returns a minimized version of JSON, everething is in one string",
		arg: "co.ameba.Esse.OtherFunctions.minifyJSON",
		autocomplete: "Minify JSON",
	},
	{
		match: "Pascal Case Transforms by concatenating capitalized words",
		title: "Pascal Case",
		uid: "co.ameba.Esse.CaseFunctions.paskalCase",
		subtitle: "Transforms by concatenating capitalized words",
		arg: "co.ameba.Esse.CaseFunctions.paskalCase",
		autocomplete: "Pascal Case",
	},
	{
		match: "Prettify JSON Returns nicely formatted JSON. Returns nothing if input text is not valid JSON",
		title: "Prettify JSON",
		uid: "co.ameba.Esse.OtherFunctions.prettyJSON",
		subtitle: "Returns nicely formatted JSON. Returns nothing if input text is not valid JSON",
		arg: "co.ameba.Esse.OtherFunctions.prettyJSON",
		autocomplete: "Prettify JSON",
	},
	{
		match:
			"Prettify and Sort JSON Returns nicely formatted and sorted JSON. Returns nothing if input text is not valid JSON",
		title: "Prettify and Sort JSON",
		uid: "co.ameba.Esse.OtherFunctions.prettySortedJSON",
		subtitle: "Returns nicely formatted and sorted JSON. Returns nothing if input text is not valid JSON",
		arg: "co.ameba.Esse.OtherFunctions.prettySortedJSON",
		autocomplete: "Prettify and Sort JSON",
	},
	{
		match:
			"ROT13 ROT13 is a simple letter substitution cipher that replaces a letter with the 13th letter after it, in the alphabet",
		title: "ROT13",
		uid: "co.ameba.Esse.OtherFunctions.rot13",
		subtitle:
			"ROT13 is a simple letter substitution cipher that replaces a letter with the 13th letter after it, in the alphabet",
		arg: "co.ameba.Esse.OtherFunctions.rot13",
		autocomplete: "ROT13",
	},
	{
		match: "RaNdOm CasE Transforms by RaNdOmLy applying uppercase or lowercase to each character",
		title: "RaNdOm CasE",
		uid: "co.ameba.Esse.CaseFunctions.randomCase",
		subtitle: "Transforms by RaNdOmLy applying uppercase or lowercase to each character",
		arg: "co.ameba.Esse.CaseFunctions.randomCase",
		autocomplete: "RaNdOm CasE",
	},
	{
		match: "Remove Duplicate Lines Removes duplicate lines",
		title: "Remove Duplicate Lines",
		uid: "co.ameba.Esse.CleaningFunctions.removeDuplicateLines",
		subtitle: "Removes duplicate lines",
		arg: "co.ameba.Esse.CleaningFunctions.removeDuplicateLines",
		autocomplete: "Remove Duplicate Lines",
	},
	{
		match: "Remove Empty Lines Removes all empty lines from text",
		title: "Remove Empty Lines",
		uid: "co.ameba.Esse.CleaningFunctions.removeEmptyLines",
		subtitle: "Removes all empty lines from text",
		arg: "co.ameba.Esse.CleaningFunctions.removeEmptyLines",
		autocomplete: "Remove Empty Lines",
	},
	{
		match: "Remove Line Numbers Removes line numbers from a numbered list",
		title: "Remove Line Numbers",
		uid: "co.ameba.Esse.CleaningFunctions.removeLineNumbers",
		subtitle: "Removes line numbers from a numbered list",
		arg: "co.ameba.Esse.CleaningFunctions.removeLineNumbers",
		autocomplete: "Remove Line Numbers",
	},
	{
		match: "Remove New Lines Removes new lines, merging all in, separated by a space",
		title: "Remove New Lines",
		uid: "co.ameba.Esse.CleaningFunctions.removeNewLines",
		subtitle: "Removes new lines, merging all in, separated by a space",
		arg: "co.ameba.Esse.CleaningFunctions.removeNewLines",
		autocomplete: "Remove New Lines",
	},
	{
		match: "Remove Quote Prefixes Cleans quotes marks(>>) from the beginning of each line in text",
		title: "Remove Quote Prefixes",
		uid: "co.ameba.Esse.CleaningFunctions.removeQuotePrefixes",
		subtitle: "Cleans quotes marks(>>) from the beginning of each line in text",
		arg: "co.ameba.Esse.CleaningFunctions.removeQuotePrefixes",
		autocomplete: "Remove Quote Prefixes",
	},
	{
		match: "Remove White Space Truncates empty space, including empty lines, tabs and multiple spaces",
		title: "Remove White Space",
		uid: "co.ameba.Esse.CleaningFunctions.collapseWhitespace",
		subtitle: "Truncates empty space, including empty lines, tabs and multiple spaces",
		arg: "co.ameba.Esse.CleaningFunctions.collapseWhitespace",
		autocomplete: "Remove White Space",
	},
	{
		match: "Reversed Returns input in reversed order.",
		title: "Reversed",
		uid: "co.ameba.Esse.OtherFunctions.reversed",
		subtitle: "Returns input in reversed order.",
		arg: "co.ameba.Esse.OtherFunctions.reversed",
		autocomplete: "Reversed",
	},
	{
		match: "SHA-256 ",
		title: "SHA-256",
		uid: "co.ameba.Esse.ConvertFunctions.sha256",
		subtitle: "",
		arg: "co.ameba.Esse.ConvertFunctions.sha256",
		autocomplete: "SHA-256",
	},
	{
		match: "SHA-384 ",
		title: "SHA-384",
		uid: "co.ameba.Esse.ConvertFunctions.sha384",
		subtitle: "",
		arg: "co.ameba.Esse.ConvertFunctions.sha384",
		autocomplete: "SHA-384",
	},
	{
		match: "SHA-512 ",
		title: "SHA-512",
		uid: "co.ameba.Esse.ConvertFunctions.sha512",
		subtitle: "",
		arg: "co.ameba.Esse.ConvertFunctions.sha512",
		autocomplete: "SHA-512",
	},
	{
		match: "Sentence Case Replaces the first character in each sentence to its corresponding uppercase value",
		title: "Sentence Case",
		uid: "co.ameba.Esse.CaseFunctions.sentenceCase",
		subtitle: "Replaces the first character in each sentence to its corresponding uppercase value",
		arg: "co.ameba.Esse.CaseFunctions.sentenceCase",
		autocomplete: "Sentence Case",
	},
	{
		match: "Shuffle Sentences Randomly shuffles sentences",
		title: "Shuffle Sentences",
		uid: "co.ameba.Esse.ConvertFunctions.shuffleSentences",
		subtitle: "Randomly shuffles sentences",
		arg: "co.ameba.Esse.ConvertFunctions.shuffleSentences",
		autocomplete: "Shuffle Sentences",
	},
	{
		match: "Shuffle Words Randomly shuffles words",
		title: "Shuffle Words",
		uid: "co.ameba.Esse.ConvertFunctions.shuffleWords",
		subtitle: "Randomly shuffles words",
		arg: "co.ameba.Esse.ConvertFunctions.shuffleWords",
		autocomplete: "Shuffle Words",
	},
	{
		match: "Sign Bunny Bunny with an important message! Non-monospaced font, may look odd...",
		title: "Sign Bunny",
		uid: "co.ameba.Esse.ASCIIFunctions.signBunny",
		subtitle: "Bunny with an important message! Non-monospaced font, may look odd...",
		arg: "co.ameba.Esse.ASCIIFunctions.signBunny",
		autocomplete: "Sign Bunny",
	},
	{
		match: "Single to Double Quotes Replace all single quotes with double quotes",
		title: "Single to Double Quotes",
		uid: "co.ameba.Esse.QuotationMarksFunctions.singleToDoubleQuotes",
		subtitle: "Replace all single quotes with double quotes",
		arg: "co.ameba.Esse.QuotationMarksFunctions.singleToDoubleQuotes",
		autocomplete: "Single to Double Quotes",
	},
	{
		match: "Snake Case Transforms by separating words with underscore symbol (_) instead of a space",
		title: "Snake Case",
		uid: "co.ameba.Esse.CaseFunctions.snakeCase",
		subtitle: "Transforms by separating words with underscore symbol (_) instead of a space",
		arg: "co.ameba.Esse.CaseFunctions.snakeCase",
		autocomplete: "Snake Case",
	},
	{
		match: "Sort Lines Ascending Sorts lines in accessing order",
		title: "Sort Lines Ascending",
		uid: "co.ameba.Esse.ConvertFunctions.sortLinesAscending",
		subtitle: "Sorts lines in accessing order",
		arg: "co.ameba.Esse.ConvertFunctions.sortLinesAscending",
		autocomplete: "Sort Lines Ascending",
	},
	{
		match: "Sort Lines Descending Sorts lines in descending order",
		title: "Sort Lines Descending",
		uid: "co.ameba.Esse.ConvertFunctions.sortLinesDescending",
		subtitle: "Sorts lines in descending order",
		arg: "co.ameba.Esse.ConvertFunctions.sortLinesDescending",
		autocomplete: "Sort Lines Descending",
	},
	{
		match: "Spell Out Numbers Converts all numbers into words, i.e. 9 ->'nine', 22 -> 'twenty two', etc.",
		title: "Spell Out Numbers",
		uid: "co.ameba.Esse.ConvertFunctions.spellOutNumbers",
		subtitle: "Converts all numbers into words, i.e. 9 ->'nine', 22 -> 'twenty two', etc.",
		arg: "co.ameba.Esse.ConvertFunctions.spellOutNumbers",
		autocomplete: "Spell Out Numbers",
	},
	{
		match: "Square Letters All letters are placed in squares",
		title: "Square Letters",
		uid: "co.ameba.Esse.OtherFunctions.squareLetters",
		subtitle: "All letters are placed in squares",
		arg: "co.ameba.Esse.OtherFunctions.squareLetters",
		autocomplete: "Square Letters",
	},
	{
		match: "Straight Quotes Replace all quotes with Straight quotes",
		title: "Straight Quotes",
		uid: "co.ameba.Esse.QuotationMarksFunctions.striaghtQuotes",
		subtitle: "Replace all quotes with Straight quotes",
		arg: "co.ameba.Esse.QuotationMarksFunctions.striaghtQuotes",
		autocomplete: "Straight Quotes",
	},
	{
		match: "Strip Numeric Characters Removes all numeric characters",
		title: "Strip Numeric Characters",
		uid: "co.ameba.Esse.CleaningFunctions.removeDigitCharacters",
		subtitle: "Removes all numeric characters",
		arg: "co.ameba.Esse.CleaningFunctions.removeDigitCharacters",
		autocomplete: "Strip Numeric Characters",
	},
	{
		match:
			"Strip non Alphanumeric Characters Removes all non alphanumeric characters, spaces and new lines stay in place",
		title: "Strip non Alphanumeric Characters",
		uid: "co.ameba.Esse.CleaningFunctions.removeNonAlphaNumericCharacters",
		subtitle: "Removes all non alphanumeric characters, spaces and new lines stay in place",
		arg: "co.ameba.Esse.CleaningFunctions.removeNonAlphaNumericCharacters",
		autocomplete: "Strip non Alphanumeric Characters",
	},
	{
		match:
			"Strip non Alphanumeric Characters Plus Removes all non alphanumeric characters, spaces, new lines and punctuation stay in place",
		title: "Strip non Alphanumeric Characters Plus",
		uid: "co.ameba.Esse.CleaningFunctions.removeNonAlphaNumericCharactersPlus",
		subtitle: "Removes all non alphanumeric characters, spaces, new lines and punctuation stay in place",
		arg: "co.ameba.Esse.CleaningFunctions.removeNonAlphaNumericCharactersPlus",
		autocomplete: "Strip non Alphanumeric Characters Plus",
	},
	{
		match: "Strip non Numeric Characters Removes all non numeric characters",
		title: "Strip non Numeric Characters",
		uid: "co.ameba.Esse.CleaningFunctions.removeNonDigitCharacters",
		subtitle: "Removes all non numeric characters",
		arg: "co.ameba.Esse.CleaningFunctions.removeNonDigitCharacters",
		autocomplete: "Strip non Numeric Characters",
	},
	{
		match: "Text Stats Returns basic statistics for provided text",
		title: "Text Stats",
		uid: "co.ameba.Esse.OtherFunctions.textStatistics",
		subtitle: "Returns basic statistics for provided text",
		arg: "co.ameba.Esse.OtherFunctions.textStatistics",
		autocomplete: "Text Stats",
	},
	{
		match: "Truncate Spaces Removes empty space in the beginning and end of the text",
		title: "Truncate Spaces",
		uid: "co.ameba.Esse.CleaningFunctions.removeSpaces",
		subtitle: "Removes empty space in the beginning and end of the text",
		arg: "co.ameba.Esse.CleaningFunctions.removeSpaces",
		autocomplete: "Truncate Spaces",
	},
	{
		match: "URL Decoded ",
		title: "URL Decoded",
		uid: "co.ameba.Esse.ConvertFunctions.urlDecoded",
		subtitle: "",
		arg: "co.ameba.Esse.ConvertFunctions.urlDecoded",
		autocomplete: "URL Decoded",
	},
	{
		match: "URL Encoded ",
		title: "URL Encoded",
		uid: "co.ameba.Esse.ConvertFunctions.urlEncoded",
		subtitle: "",
		arg: "co.ameba.Esse.ConvertFunctions.urlEncoded",
		autocomplete: "URL Encoded",
	},
	{
		match: "Unquote Sentence Unquotes sentence, ignores quotes within the sentence.",
		title: "Unquote Sentence",
		uid: "co.ameba.Esse.QuotationMarksFunctions.removeSentenceQuotes",
		subtitle: "Unquotes sentence, ignores quotes within the sentence.",
		arg: "co.ameba.Esse.QuotationMarksFunctions.removeSentenceQuotes",
		autocomplete: "Unquote Sentence",
	},
	{
		match: "Uppercase Returns a version of the text with all letters converted to uppercase",
		title: "Uppercase",
		uid: "co.ameba.Esse.CaseFunctions.upperCase",
		subtitle: "Returns a version of the text with all letters converted to uppercase",
		arg: "co.ameba.Esse.CaseFunctions.upperCase",
		autocomplete: "Uppercase",
	},
	{
		match: "Upside Down Transform text to upside down -> ʇxǝʇ",
		title: "Upside Down",
		uid: "co.ameba.Esse.OtherFunctions.upsideDown",
		subtitle: "Transform text to upside down -> ʇxǝʇ",
		arg: "co.ameba.Esse.OtherFunctions.upsideDown",
		autocomplete: "Upside Down",
	},
	{
		match:
			"Wrap Paragraph in Quotes Wraps each paragraph in provided text in quotes, replacing all existing double quotes with single quotes",
		title: "Wrap Paragraph in Quotes",
		uid: "co.ameba.Esse.QuotationMarksFunctions.wrapParagraphInQuotes",
		subtitle:
			"Wraps each paragraph in provided text in quotes, replacing all existing double quotes with single quotes",
		arg: "co.ameba.Esse.QuotationMarksFunctions.wrapParagraphInQuotes",
		autocomplete: "Wrap Paragraph in Quotes",
	},
	{
		match: "Wrap in Quotes Wraps provided text in quotes, replacing all existing double quotes with single quotes",
		title: "Wrap in Quotes",
		uid: "co.ameba.Esse.QuotationMarksFunctions.smartWrapInQuotes",
		subtitle: "Wraps provided text in quotes, replacing all existing double quotes with single quotes",
		arg: "co.ameba.Esse.QuotationMarksFunctions.smartWrapInQuotes",
		autocomplete: "Wrap in Quotes",
	},
];

const CACHE: { [key: string]: string } = {};

async function runEsseAsync(input: string, transformationId: string, callback: (_: string) => void) {
	const cached_value = CACHE[transformationId];
	if (cached_value !== undefined) {
		callback(cached_value);
		return;
	}

	const proc = execFile(
		"/Applications/Esse.app/Contents/MacOS/EsseCommandLine",
		["-t", transformationId, "-i", input],
		{ env: {}, encoding: "utf8" },
		(error, stdout, _stderr) => {
			console.log("ran esse");
			if (error) {
				throw error;
			}

			CACHE[transformationId] = stdout;
			callback(stdout);
		}
	);
	proc.stdin?.end();

	// return stdout;
}

function textToMarkdown(input: string): string {
	return `\`\`\`text\n${input}\n\`\`\``;
}

type Result = { transformedText: string; markdown: string };

export default function Command() {
	// IGNORE COMMENT \
	// "Prime the pump", as it were. The first call to execFile (and related methods) is
	// very slow; subsequent calls are faster. So we throw in a fake async call at the
	// beginning to speed up the subsequent ones \
	// END IGNORE

	const defaultActionId = ESSE_ITEMS[0].uid;

	const [textInfo, setTextInfo] = useState({ text: "", clipboardWasRead: false });
	const [isLoading, setIsLoading] = useState(true);
	const [actionId, setActionId] = useState(defaultActionId);

	const initialResult = { transformedText: textInfo.text, markdown: "Loading..." };
	const [result, setResult] = useState(initialResult);

	useEffect(() => {
		function finish(result: Result) {
			setResult(result);
			setIsLoading(false);
		}

		setIsLoading(true);
		const { text, clipboardWasRead } = textInfo;

		if (clipboardWasRead && text.length === 0) {
			finish({
				transformedText: "",
				markdown: "<no text on clipboard>",
			});
		} else if (!clipboardWasRead) {
			finish(initialResult);
		} else {
			runEsseAsync(text, actionId, (transformedText) => {
				const markdown = textToMarkdown(transformedText);
				finish({ transformedText, markdown });
			});

			// transformedText = runEsse(text, actionId);
			// markdown = textToMarkdown(transformedText);
		}

		// setResult({ transformedText, markdown });

		// setIsLoading(false);
	}, [textInfo, actionId]);

	// TODO: add `getSelectedText` here as well, before Clipboard.readText() \
	// Currently this results in the error `Cannot copy selected text from frontmost
	// application.`
	Promise.all([Clipboard.readText()]).then(([clipboard]) => {
		setTextInfo({ text: clipboard ?? "", clipboardWasRead: true });
	});

	return (
		<List
			navigationTitle="Esse"
			isShowingDetail
			isLoading={isLoading}
			onSelectionChange={(actionId) => {
				actionId = actionId ?? defaultActionId;
				setActionId(actionId);
			}}
		>
			{ESSE_ITEMS.map(({ title, subtitle, autocomplete, uid }) => {
				subtitle = subtitle ?? autocomplete ?? title;
				return (
					<List.Item
						title={title}
						accessories={[{ icon: Icon.QuestionMark, tooltip: subtitle }]}
						id={uid}
						key={uid}
						detail={<List.Item.Detail markdown={result.markdown}></List.Item.Detail>}
						actions={
							<ActionPanel title="#1 in raycast/extensions">
								<Action.CopyToClipboard title="Copy to Clipboard" content={result.transformedText} />
							</ActionPanel>
						}
					></List.Item>
				);
			})}
		</List>
	);
}
