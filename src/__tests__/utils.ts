import { Mock } from 'vitest';

export const delay = (time: number) => new Promise((res) => setTimeout(res, time));
export const awaitTranslation = () => delay(120);

export const TRANSLATION_SYMBOL = '***TRANSLATED***';
export const translator = async (text: string) => TRANSLATION_SYMBOL + text;

export const escapeRegexString = (input: string) =>
	input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const startsWithRegex = (input: string) =>
	new RegExp(`^${escapeRegexString(input)}`);
export const endsWithRegex = (input: string) =>
	new RegExp(`${escapeRegexString(input)}$`);
export const containsRegex = (input: string) => new RegExp(`${escapeRegexString(input)}`);

/**
 * Create a mock that sets the real values for the element coordinates
 * because jsdom does not actually modify element coordinates
 */
export const mockBoundingClientRect = (
	element: HTMLElement,
	rect: {
		width: number;
		height: number;
		x: number;
		y: number;
	},
) => {
	Object.defineProperty(element, 'getBoundingClientRect', {
		configurable: true,
		value: () => ({
			top: rect.y,
			left: rect.x,
			bottom: rect.height + rect.y,
			right: rect.width + rect.x,
			...rect,
		}),
	});
};

export const resetElementPosition = (
	node: HTMLElement,
	{
		width = 100,
		height = 100,
		x = 0,
		y = 0,
	}: {
		width?: number;
		height?: number;
		x?: number;
		y?: number;
	} = {},
) => {
	mockBoundingClientRect(node, {
		width,
		height,
		x,
		y,
	});
	// simulate a scroll event; the polyfill listens for the "scroll" event on the document
	// The polyfill starts recalculating element positions only after the event
	document.dispatchEvent(new Event('scroll'));
};

export const waitForMockCall = (callback: Mock, timeout = 200) => {
	const initialCallCount = callback.mock.calls.length;

	return new Promise((resolve, reject) => {
		const start = Date.now();

		const interval = setInterval(() => {
			if (callback.mock.calls.length > initialCallCount) {
				clearInterval(interval);
				resolve(callback.mock.calls);
			}

			if (Date.now() - start > timeout) {
				clearInterval(interval);
				reject(new Error('Timeout expired'));
			}
		}, 10);
	});
};
