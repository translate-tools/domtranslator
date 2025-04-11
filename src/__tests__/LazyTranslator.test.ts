import { vi } from 'vitest';

import { LazyTranslator } from '../LazyTranslator';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL } from './utils';

require('intersection-observer');

const translator = vi.fn().mockImplementation(async (node: Text) => {
	return (node.textContent = TRANSLATION_SYMBOL + node.textContent);
});

const isTranslatableNode = (node: Node) => node instanceof Text;

describe('base usage', () => {
	const divElement = document.createElement('div');
	const textNode = document.createTextNode('Hello, World!');

	divElement.appendChild(textNode);
	document.body.appendChild(divElement);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('translate element at intersection', async () => {
		const lazyTranslator = new LazyTranslator(isTranslatableNode, translator);

		const isLazyTranslate = lazyTranslator.isLazilyTranslatable(textNode);

		await awaitTranslation();

		// The mock function was called ones
		expect(translator.mock.calls).toHaveLength(1);
		expect(translator).toHaveBeenCalledWith(textNode);

		// the node translate lazy
		expect(isLazyTranslate).toBe(true);
		expect(textNode.textContent).toMatchObject(containsRegex(TRANSLATION_SYMBOL));
	});

	test('translate node that intersect the custom ancestor', async () => {
		const lazyTranslator = new LazyTranslator(isTranslatableNode, translator, {
			root: divElement,
		});

		const isLazyTranslate = lazyTranslator.isLazilyTranslatable(textNode);

		await awaitTranslation();

		// The mock function was called ones
		expect(translator.mock.calls).toHaveLength(1);
		expect(translator).toHaveBeenCalledWith(textNode);

		// the node translate lazy
		expect(isLazyTranslate).toBe(true);
		expect(textNode.textContent).toMatchObject(containsRegex(TRANSLATION_SYMBOL));
	});

	test('not translate nodes that not intersected', async () => {
		const lazyTranslator = new LazyTranslator(isTranslatableNode, translator);

		const textNode = document.createTextNode('Hello World!');

		const isLazyTranslate = lazyTranslator.isLazilyTranslatable(textNode);

		await awaitTranslation();

		// The mock function was not called
		expect(translator.mock.calls).toHaveLength(0);

		expect(isLazyTranslate).toBe(false);
	});

	test('not translate node that not intersect the custom ancestor', async () => {
		const lazyTranslator = new LazyTranslator(isTranslatableNode, translator, {
			root: divElement,
		});

		const textNode = document.createTextNode('Hello World!');

		const isLazyTranslate = lazyTranslator.isLazilyTranslatable(textNode);

		await awaitTranslation();

		expect(isLazyTranslate).toBe(false);
	});
});
