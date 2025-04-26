import { LazyDOMTranslator } from '../LazyDOMTranslator';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL } from './utils';

require('intersection-observer');

const translator = vi.fn().mockImplementation(async (node: Text) => {
	return (node.textContent = TRANSLATION_SYMBOL + node.textContent);
});

const isTranslatableNode = (node: Node) => node instanceof Text;

describe('LazyTranslator base usage', () => {
	const divElement = document.createElement('div');
	const textNode = document.createTextNode('Hello, World!');

	divElement.appendChild(textNode);
	document.body.appendChild(divElement);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('translate element at intersection', async () => {
		const lazyTranslator = new LazyDOMTranslator({ isTranslatableNode, translator });

		lazyTranslator.attach(divElement);
		await awaitTranslation();

		// The mock function was called ones
		expect(translator.mock.calls).toHaveLength(1);
		expect(translator).toHaveBeenCalledWith(textNode);

		// the node translate lazy
		expect(textNode.textContent).toMatchObject(containsRegex(TRANSLATION_SYMBOL));
	});

	test('translate node that intersect the custom ancestor', async () => {
		const lazyTranslator = new LazyDOMTranslator({
			isTranslatableNode,
			translator,
			config: {
				intersectionConfig: {
					root: divElement,
				},
			},
		});
		lazyTranslator.attach(divElement);
		await awaitTranslation();

		// The mock function was called ones
		expect(translator.mock.calls).toHaveLength(1);
		expect(translator).toHaveBeenCalledWith(textNode);

		// the node translate lazy
		expect(textNode.textContent).toMatchObject(containsRegex(TRANSLATION_SYMBOL));
	});

	test('not translate nodes that not intersected', async () => {
		const lazyTranslator = new LazyDOMTranslator({ isTranslatableNode, translator });

		const newDivElement = document.createElement('div');

		lazyTranslator.attach(newDivElement);
		await awaitTranslation();

		// The mock function was not called
		expect(translator.mock.calls).toHaveLength(0);
		expect(newDivElement.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
	});

	test('not translate node that not intersect the custom ancestor', async () => {
		const divElement = document.createElement('div');
		const lazyTranslator = new LazyDOMTranslator({
			isTranslatableNode,
			translator,
			config: {
				intersectionConfig: {
					root: divElement,
				},
			},
		});

		const newDivElement = document.createElement('div');

		lazyTranslator.attach(newDivElement);
		await awaitTranslation();

		expect(translator.mock.calls).toHaveLength(0);
		expect(newDivElement.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
	});
});
