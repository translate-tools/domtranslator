import { readFileSync } from 'fs';

import { DomTranslationProcessor } from '../DomTranslationProcessor';
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
	let domTranslationProcessor: DomTranslationProcessor;
	let div: Element;

	beforeEach(() => {
		div = document.createElement('div');
		div.innerHTML = 'Hello world!';

		const isTranslatableNode = (node: Node) => node instanceof Text;

		domTranslationProcessor = new DomTranslationProcessor(
			isTranslatableNode,
			new NodeStorage(),
			translator,
		);
	});

	test('transalate whole document', async () => {
		fillDocument(sample);
		const parsedHTML = document.documentElement.outerHTML;

		// translate document

		domTranslationProcessor.addNode(document.documentElement);
		await awaitTranslation();
		expect(document.documentElement.outerHTML).toMatchSnapshot();

		// disable translation

		domTranslationProcessor.deleteNode(document.documentElement);
		expect(document.documentElement.outerHTML).toBe(parsedHTML);
	});

	test('getNodeData returns the original text', async () => {
		const originalText = 'Hello world!';

		// translate document
		domTranslationProcessor.addNode(div);

		await awaitTranslation();

		expect(domTranslationProcessor.getOriginalNodeText(div.childNodes[0])).toEqual(
			expect.objectContaining({
				originalText: originalText,
			}),
		);
	});

	test('not translate empy element', async () => {
		div.innerHTML = '';
		// translate document
		domTranslationProcessor.addNode(div);

		await awaitTranslation();
		expect(div.innerHTML).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
	});

	test('process the element tree', () => {
		const div1 = document.createElement('div');
		div1.innerHTML = 'Hello world too!';
		div.append(div1);

		const spy = vi.fn((node: Node) => {
			if (node.textContent) {
				translator(node.textContent);
			}
		});

		domTranslationProcessor.processNodesInElement(div, spy);

		expect(spy).toHaveBeenCalledTimes(2);
		expect(spy).toHaveBeenCalledWith(div1.childNodes[0]);
		expect(spy).not.toHaveBeenCalledWith(div1);
	});

	test('process the element tree with shadow dom', async () => {
		const container = document.createElement('div');
		const shadowRoot = container.attachShadow({ mode: 'open' });
		const shadowElement = document.createElement('p');
		shadowElement.textContent = 'Shadow text';
		shadowElement.setAttribute('data-test', 'value');
		shadowRoot.appendChild(shadowElement);

		const spy = vi.fn();

		domTranslationProcessor.processNodesInElement(container, spy);
		await awaitTranslation();

		expect(spy).toHaveBeenCalledWith(shadowElement.firstChild);
		expect(spy).toBeCalledTimes(1);
	});

	test('disable translation only for the target node', async () => {
		const div1 = document.createElement('div');
		div1.innerHTML = 'Hello world too!';
		div.append(div1);

		domTranslationProcessor.addNode(div);
		await awaitTranslation();

		domTranslationProcessor.deleteNode(div, true);

		// child node has translated text
		expect(div1.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));
	});

	test('isNodeStorageHas returns true if element is stored', async () => {
		domTranslationProcessor.addNode(div);
		await awaitTranslation();

		expect(domTranslationProcessor.isNodeStorageHas(div.childNodes[0])).toBe(true);
	});

	test('translates element and node correctly', async () => {
		// translate text node

		const textNode = div.childNodes[0];

		domTranslationProcessor.addNode(textNode);
		await awaitTranslation();
		expect(textNode.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

		// reset translation for text node
		domTranslationProcessor.deleteNode(textNode);
		expect(textNode.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

		// translate element

		const div1 = document.createElement('div');
		div1.innerHTML = 'Hello world 2!';

		domTranslationProcessor.addNode(div1);
		await awaitTranslation();
		expect(div1.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));

		// reset translation for element
		domTranslationProcessor.deleteNode(div1);
		expect(div1.innerHTML).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
	});

	test('updateNode should be call ones', async () => {
		document.body.appendChild(div);

		// spy on the updateNode method
		const updateNodesSpy = vi.spyOn(
			domTranslationProcessor as DomTranslationProcessor,
			'updateNode',
		);

		domTranslationProcessor.addNode(div);
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
