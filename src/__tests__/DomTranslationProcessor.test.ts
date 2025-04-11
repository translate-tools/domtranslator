import { readFileSync } from 'fs';

import { DomNodesTranslator } from '../DomTranslationProcessor';
import { NodeStorage } from '../NodeStorage';
import {
	awaitTranslation,
	containsRegex,
	fillDocument,
	TRANSLATION_SYMBOL,
	translator,
} from './utils';

const sample = readFileSync(__dirname + '/sample.html', 'utf8');

describe('base usage', () => {
	let domTranslationProcessor: DomNodesTranslator;
	let div: Element;

	const spy = vi.fn(async (node: Node) => {
		if (node.textContent) {
			node.textContent = await translator(node.textContent);
		}
	});

	afterEach(() => {
		spy.mockClear();
	});

	beforeEach(() => {
		div = document.createElement('div');
		div.innerHTML = 'Hello world!';

		const isTranslatableNode = (node: Node) => node instanceof Text;

		domTranslationProcessor = new DomNodesTranslator(
			isTranslatableNode,
			new NodeStorage(),
			translator,
		);
	});

	test('translate whole document', async () => {
		fillDocument(sample);
		const parsedHTML = document.documentElement.outerHTML;

		// translate document
		if (document.documentElement instanceof Element) {
			domTranslationProcessor.processNodesInElement(
				document.documentElement,
				(node) => {
					domTranslationProcessor.addNode(node);
				},
			);
		}

		await awaitTranslation();
		expect(document.documentElement.outerHTML).toMatchSnapshot();

		// disable translation

		domTranslationProcessor.deleteNode(document.documentElement);
		expect(document.documentElement.outerHTML).toBe(parsedHTML);
	});

	test('getNodeData returns the original text', async () => {
		const originalText = 'Hello world!';

		// translate
		domTranslationProcessor.addNode(div.childNodes[0]);

		await awaitTranslation();

		expect(domTranslationProcessor.getOriginalNodeText(div.childNodes[0])).toEqual(
			expect.objectContaining({
				originalText: originalText,
			}),
		);
	});

	test('not translate empty element', async () => {
		div.innerHTML = ' ';
		// translate document

		domTranslationProcessor.addNode(div.childNodes[0]);
		await awaitTranslation();

		expect(div.childNodes[0].textContent).not.toMatch(
			containsRegex(TRANSLATION_SYMBOL),
		);
	});

	test('process the element tree', async () => {
		const div1 = document.createElement('div');
		div1.innerHTML = 'Hello world too!';
		div.append(div1);

		domTranslationProcessor.processNodesInElement(div, spy);
		await awaitTranslation();

		expect(spy).toHaveBeenCalledTimes(2);
		expect(spy).toHaveBeenCalledWith(div1.childNodes[0]);
		expect(spy).not.toHaveBeenCalledWith(div1);
		expect(div1.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));
	});

	test('process the element tree with shadow dom', async () => {
		const container = document.createElement('div');
		const shadowRoot = container.attachShadow({ mode: 'open' });
		const shadowElement = document.createElement('p');
		shadowElement.textContent = 'Shadow text';
		shadowElement.setAttribute('data-test', 'value');
		shadowRoot.appendChild(shadowElement);

		domTranslationProcessor.processNodesInElement(container, spy);
		await awaitTranslation();

		expect(spy).toHaveBeenCalledWith(shadowElement.firstChild);
		expect(spy).toBeCalledTimes(1);
		expect(shadowElement.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));
	});

	test('disable translation only for the target node', async () => {
		const handelTree = (node: Node) => {
			if (node instanceof Element) {
				domTranslationProcessor.processNodesInElement(node, (node) => {
					domTranslationProcessor.addNode(node);
				});
			}
		};
		const div1 = document.createElement('div');
		div1.innerHTML = 'Hello world too!';
		div.append(div1);

		// delete the target element and its nested items
		handelTree(div1);
		await awaitTranslation();

		domTranslationProcessor.deleteNode(div);

		// child node and target has not translated text
		expect(div1.innerHTML).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
		expect(div.innerHTML).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

		// delete translation only for the target element
		handelTree(div);
		await awaitTranslation();

		domTranslationProcessor.deleteNode(div.childNodes[0], true);

		expect(div.childNodes[0].textContent).not.toMatch(
			containsRegex(TRANSLATION_SYMBOL),
		);
		// child element still has translation
		expect(div1.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));
	});

	test('isNodeStorageHas returns correct result', async () => {
		domTranslationProcessor.addNode(div.childNodes[0]);
		await awaitTranslation();

		expect(domTranslationProcessor.isNodeStorageHas(div.childNodes[0])).toBe(true);

		//delete element
		domTranslationProcessor.deleteNode(div.childNodes[0]);
		expect(domTranslationProcessor.isNodeStorageHas(div.childNodes[0])).toBe(false);
	});

	test('updateNode should be call ones', async () => {
		document.body.appendChild(div);

		// spy on the updateNode method
		const updateNodesSpy = vi.spyOn(
			domTranslationProcessor as DomNodesTranslator,
			'updateNode',
		);

		// translate element
		if (div instanceof Element) {
			domTranslationProcessor.processNodesInElement(div, (node) => {
				domTranslationProcessor.addNode(node);
			});
		}
		await awaitTranslation();

		// update element

		const newText = 'Goodbye world!';
		div.innerHTML = newText;
		domTranslationProcessor.addNode(div.childNodes[0]);
		await awaitTranslation();

		domTranslationProcessor.updateNode(div.childNodes[0]);
		await awaitTranslation();

		expect(div.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));

		expect(updateNodesSpy).toBeCalledTimes(1);
		expect(updateNodesSpy.mock.calls[0][0]).toMatchObject(
			containsRegex(TRANSLATION_SYMBOL),
		);
	});
});
