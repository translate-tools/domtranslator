export const delay = (time: number) => new Promise((res) => setTimeout(res, time));
export const awaitTranslation = () => delay(120);

export const fillDocument = (text: string) => {
	document.write(text);
};

export const composeName = (...args: (string | boolean)[]) =>
	args.filter(Boolean).join(' ');

export const TRANSLATION_SYMBOL = '***TRANSLATED***';
export const translator = async (text: string) => TRANSLATION_SYMBOL + text;

export const escapeRegexString = (input: string) =>
	input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const containsRegex = (input: string) => new RegExp(`${escapeRegexString(input)}`);

export const startsWithRegex = (input: string) =>
	new RegExp(`^${escapeRegexString(input)}`);

export const endsWithRegex = (input: string) =>
	new RegExp(`${escapeRegexString(input)}$`);

export const getElementText = (elm: Element | null) =>
	elm && elm.textContent ? elm.textContent.trim() : null;
