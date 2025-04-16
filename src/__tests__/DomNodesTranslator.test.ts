import { DomNodeTranslator } from '../DomNodeTranslator';
import { handleTree } from '../utils/handleTree';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL, translator } from './utils';

describe('DomNodeTranslator base usage', () => {
	let domNodesTranslator: DomNodeTranslator;
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

		domNodesTranslator = new DomNodeTranslator(isTranslatableNode, translator);
	});

	test('correct translate element', async () => {
		const div = document.createElement('div');
		const originalText = 'Hello world!';
		div.innerHTML = originalText;

		domNodesTranslator.addNode(div.childNodes[0]);
		await awaitTranslation();

		expect(div.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));

		// disable translation
		domNodesTranslator.deleteNode(div.childNodes[0]);
		expect(div.innerHTML).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
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

	test('isNodeStorageHas returns correct result', async () => {
		domNodesTranslator.addNode(div.childNodes[0]);
		await awaitTranslation();

		expect(domNodesTranslator.has(div.childNodes[0])).toBe(true);

		//delete element
		domNodesTranslator.deleteNode(div.childNodes[0]);
		expect(domNodesTranslator.has(div.childNodes[0])).toBe(false);
	});

	describe('DeleteNode', () => {
		let parentDiv: Element;
		let childDiv: Element;

		const handelTree = (node: Node, callback: (node: Node) => void) => {
			if (node instanceof Element) {
				handleTree(node, (node) => {
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
			// delete the target element and its nested items
			handelTree(parentDiv, domNodesTranslator.addNode);
			await awaitTranslation();

			domNodesTranslator.deleteNode(parentDiv);

			// child node and target has not translated text
			expect(parentDiv.innerHTML).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
			expect(childDiv.innerHTML).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
		});

		test('delete translation from the selected node', async () => {
			// delete translation only for the target element
			handelTree(parentDiv, domNodesTranslator.addNode);
			await awaitTranslation();

			domNodesTranslator.deleteNode(parentDiv.childNodes[0], true);

			expect(parentDiv.childNodes[0].textContent).not.toMatch(
				containsRegex(TRANSLATION_SYMBOL),
			);
			// child element still has translation
			expect(childDiv.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));
		});
	});

	test('updateNode should be call ones', async () => {
		document.body.appendChild(div);

		// spy on the updateNode method
		const updateNodesSpy = vi.spyOn(
			domNodesTranslator as DomNodeTranslator,
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
