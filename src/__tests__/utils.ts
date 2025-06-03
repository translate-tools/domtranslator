export const delay = (time: number) => new Promise((res) => setTimeout(res, time));
export const awaitTranslation = () => delay(120);

export const TRANSLATION_SYMBOL = '***TRANSLATED***';
export const translator = async (text: string) => TRANSLATION_SYMBOL + text;

export const escapeRegexString = (input: string) =>
	input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

export const translatorMockWithDelays = vi
	.fn()
	.mockImplementationOnce(
		(text: string) =>
			new Promise((resolve) => setTimeout(() => resolve(translator(text)), 300)),
	)
	.mockImplementationOnce(
		(text: string) =>
			new Promise((resolve) => setTimeout(() => resolve(translator(text)), 100)),
	);
