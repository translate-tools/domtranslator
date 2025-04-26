import { DOMTranslator } from '../DOMTranslator';
import { visitWholeTree } from '../utils/visitWholeTree';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL, translator } from './utils';

describe('DomNodeTranslator base usage', () => {
	let domNodeTranslator: DOMTranslator;
	let div: Element;

	beforeEach(() => {
		div = document.createElement('div');
		div.innerHTML = 'Hello world!';

		const isTranslatableNode = (node: Node) => node instanceof Text;

		domNodeTranslator = new DOMTranslator({
			isTranslatableNode,
			translateCallback: translator,
		});
	});

	test('correct translate element', async () => {
		const div = document.createElement('div');
		const originalText = 'Hello world!';
		div.innerHTML = originalText;

		domNodeTranslator.translateNode(div.childNodes[0]);
		await awaitTranslation();

		expect(div.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));

		// disable translation
		domNodeTranslator.restoreNode(div.childNodes[0]);
		expect(div.innerHTML).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
	});

	test('getNodeData returns the original text', async () => {
		const originalText = 'Hello world!';

		// translate
		domNodeTranslator.translateNode(div.childNodes[0]);
		await awaitTranslation();

		expect(domNodeTranslator.getOriginalNodeText(div.childNodes[0])).toEqual(
			expect.objectContaining({
				originalText: originalText,
			}),
		);
	});

	test('not translate empty element', async () => {
		div.innerHTML = ' ';

		// translate
		domNodeTranslator.translateNode(div.childNodes[0]);
		await awaitTranslation();

		expect(div.childNodes[0].textContent).not.toMatch(
			containsRegex(TRANSLATION_SYMBOL),
		);
	});

	test('isNodeStorageHas returns correct result', async () => {
		domNodeTranslator.translateNode(div.childNodes[0]);
		await awaitTranslation();

		expect(domNodeTranslator.hasNode(div.childNodes[0])).toBe(true);

		//delete element
		domNodeTranslator.restoreNode(div.childNodes[0]);
		expect(domNodeTranslator.hasNode(div.childNodes[0])).toBe(false);
	});

	describe('DeleteNode', () => {
		let parentDiv: Element;
		let childDiv: Element;

		const handleElementTree = (node: Node, callback: (node: Node) => void) => {
			if (node instanceof Element) {
				visitWholeTree(node, (node) => {
					callback(node);
				});
			}
		};

		beforeEach(() => {
			parentDiv = document.createElement('div');
			parentDiv.innerHTML = 'Hello world!';

			childDiv = document.createElement('div');
			childDiv.innerHTML = 'Hello world too!';
			parentDiv.append(childDiv);
		});

		test('delete translations from all nodes in the tree', async () => {
			handleElementTree(parentDiv, domNodeTranslator.translateNode);
			await awaitTranslation();

			domNodeTranslator.restoreNode(parentDiv);

			// child node and target has not translated text
			expect(parentDiv.innerHTML).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
			expect(childDiv.innerHTML).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
		});

		test('delete translation from the selected node', async () => {
			handleElementTree(parentDiv, domNodeTranslator.translateNode);
			await awaitTranslation();

			domNodeTranslator.restoreNode(parentDiv.childNodes[0], true);

			//target element has not translation
			expect(parentDiv.childNodes[0].textContent).not.toMatch(
				containsRegex(TRANSLATION_SYMBOL),
			);
			// child element still has translation
			expect(childDiv.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));
		});
	});

	test('updateNode should be call ones', async () => {
		const div = document.createElement('div');
		const originalText = 'Hello world!';
		div.innerHTML = originalText;

		// spy on the updateNode method
		const updateNodesSpy = vi.spyOn(domNodeTranslator as DOMTranslator, 'updateNode');

		// translate element
		domNodeTranslator.translateNode(div.childNodes[0]);
		await awaitTranslation();

		// update element
		const newText = 'Goodbye world!';
		div.innerHTML = newText;

		domNodeTranslator.translateNode(div.childNodes[0]);
		await awaitTranslation();

		domNodeTranslator.updateNode(div.childNodes[0]);
		await awaitTranslation();

		expect(div.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));
		expect(updateNodesSpy).toBeCalledTimes(1);
		expect(updateNodesSpy.mock.calls[0][0]).toMatchObject(
			containsRegex(TRANSLATION_SYMBOL),
		);
	});
});
