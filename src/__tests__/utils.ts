export const delay = (time: number) => new Promise((res) => setTimeout(res, time));
export const awaitTranslation = () => delay(120);

export const TRANSLATION_SYMBOL = '***TRANSLATED***';
export const translator = async (text: string) => TRANSLATION_SYMBOL + text;

export const escapeRegexString = (input: string) =>
	input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const containsRegex = (input: string) => new RegExp(`${escapeRegexString(input)}`);
