import { readFileSync } from 'fs';

import { DomNodesTranslator, handleTree } from '../DomNodesTranslator';
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
	let domNodesTranslator: DomNodesTranslator;
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

		domNodesTranslator = new DomNodesTranslator(
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
			handleTree(document.documentElement, (node) => {
				domNodesTranslator.addNode(node);
			});
		}

		await awaitTranslation();
		expect(document.documentElement.outerHTML).toMatchSnapshot();

		// disable translation

		domNodesTranslator.deleteNode(document.documentElement);
		expect(document.documentElement.outerHTML).toBe(parsedHTML);
	});

	test('getNodeData returns the original text', async () => {
		const originalText = 'Hello world!';

		// translate
		domNodesTranslator.addNode(div.childNodes[0]);

		await awaitTranslation();

		expect(domNodesTranslator.getOriginalNodeText(div.childNodes[0])).toEqual(
			expect.objectContaining({
				originalText: originalText,
			}),
		);
	});

	test('not translate empty element', async () => {
		div.innerHTML = ' ';
		// translate document

		domNodesTranslator.addNode(div.childNodes[0]);
		await awaitTranslation();

		expect(div.childNodes[0].textContent).not.toMatch(
			containsRegex(TRANSLATION_SYMBOL),
		);
	});

	test('disable translation only for the target node', async () => {
		const handelTree1 = (node: Node) => {
			if (node instanceof Element) {
				handleTree(node, (node) => {
					domNodesTranslator.addNode(node);
				});
			}
		};
		const div1 = document.createElement('div');
		div1.innerHTML = 'Hello world too!';
		div.append(div1);

		// delete the target element and its nested items
		handelTree1(div1);
		await awaitTranslation();

		domNodesTranslator.deleteNode(div);

		// child node and target has not translated text
		expect(div1.innerHTML).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
		expect(div.innerHTML).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

		// delete translation only for the target element
		handelTree1(div);
		await awaitTranslation();

		domNodesTranslator.deleteNode(div.childNodes[0], true);

		expect(div.childNodes[0].textContent).not.toMatch(
			containsRegex(TRANSLATION_SYMBOL),
		);
		// child element still has translation
		expect(div1.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));
	});

	test('isNodeStorageHas returns correct result', async () => {
		domNodesTranslator.addNode(div.childNodes[0]);
		await awaitTranslation();

		expect(domNodesTranslator.isNodeStorageHas(div.childNodes[0])).toBe(true);

		//delete element
		domNodesTranslator.deleteNode(div.childNodes[0]);
		expect(domNodesTranslator.isNodeStorageHas(div.childNodes[0])).toBe(false);
	});

	test('updateNode should be call ones', async () => {
		document.body.appendChild(div);

		// spy on the updateNode method
		const updateNodesSpy = vi.spyOn(
			domNodesTranslator as DomNodesTranslator,
			'updateNode',
		);

		// translate element
		if (div instanceof Element) {
			handleTree(div, (node) => {
				domNodesTranslator.addNode(node);
			});
		}
		await awaitTranslation();

		// update element

		const newText = 'Goodbye world!';
		div.innerHTML = newText;
		domNodesTranslator.addNode(div.childNodes[0]);
		await awaitTranslation();

		domNodesTranslator.updateNode(div.childNodes[0]);
		await awaitTranslation();

		expect(div.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));

		expect(updateNodesSpy).toBeCalledTimes(1);
		expect(updateNodesSpy.mock.calls[0][0]).toMatchObject(
			containsRegex(TRANSLATION_SYMBOL),
		);
	});
});
