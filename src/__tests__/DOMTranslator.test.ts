import { DOMTranslator } from '../DOMTranslator';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL, translator } from './utils';

test('Translate and restore original node text', async () => {
	const domTranslator = new DOMTranslator({
		isTranslatableNode: Boolean,
		translateCallback: translator,
	});

	const originElementText = 'Hello world!';
	const div = document.createElement('div');
	div.innerHTML = originElementText;

	domTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();

	expect(div.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// disable translation
	domTranslator.restoreNode(div.childNodes[0]);
	expect(div.innerHTML).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(div.innerHTML).toMatch(originElementText);
});

test('Returns original text node after translation', async () => {
	const domTranslator = new DOMTranslator({
		isTranslatableNode: Boolean,
		translateCallback: translator,
	});

	const originElementText = 'Hello world!';
	const div = document.createElement('div');
	div.innerHTML = originElementText;

	// translate
	domTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();

	expect(domTranslator.getOriginalNodeText(div.childNodes[0])).toEqual(
		originElementText,
	);
});

test('Translated node has in the storage', async () => {
	const domTranslator = new DOMTranslator({
		isTranslatableNode: Boolean,
		translateCallback: translator,
	});
	const div = document.createElement('div');
	div.innerHTML = 'Hello world!';

	domTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();

	expect(domTranslator.hasNode(div.childNodes[0])).toBe(true);

	//delete element
	domTranslator.restoreNode(div.childNodes[0]);
	expect(domTranslator.hasNode(div.childNodes[0])).toBe(false);
});

test('Calls updateNode when node content is updated', async () => {
	const domTranslator = new DOMTranslator({
		isTranslatableNode: Boolean,
		translateCallback: translator,
	});
	// spy on the updateNode method
	const updateNodesSpy = vi.spyOn(domTranslator as DOMTranslator, 'updateNode');

	const text = 'Hello world!';
	const div = document.createElement('div');
	div.innerHTML = text;

	// translate element
	domTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();

	// In the actual code the sequence of calls is as follows:
	// Node is translated -> the node's content is changed ->
	// Node update event is triggered -> the updateNode method is called with new translated content
	domTranslator.updateNode(div.childNodes[0]);
	await awaitTranslation();

	// update calls one time
	expect(updateNodesSpy).toBeCalledTimes(1);
	expect(updateNodesSpy.mock.calls).toEqual([[div.childNodes[0]]]);
	expect(updateNodesSpy.mock.calls).toEqual([
		[
			expect.objectContaining({
				nodeValue: expect.stringMatching(containsRegex(TRANSLATION_SYMBOL)),
			}),
		],
	]);
});

test('Restored node contain the most recent content after few translate', async () => {
	const domTranslator = new DOMTranslator({
		isTranslatableNode: Boolean,
		translateCallback: translator,
	});
	const div = document.createElement('div');
	div.innerHTML = 'Hello world!';

	// translate
	domTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();

	// translate again
	const newText = 'Hello world 1234!';
	div.innerHTML = newText;
	domTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();

	// restore, elements have the last updated text and have not translated
	domTranslator.restoreNode(div.childNodes[0]);
	expect(div.innerHTML).toMatch(newText);
	expect(div.innerHTML).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Restore translations from all nested nodes in the element', async () => {
	// mock for to translate the entire element tree
	const handleElementTree = (node: Node, callback: (node: Node) => void) => {
		if (node instanceof Element) {
			vi.fn((root: Element, callback: (n: Node) => void) => {
				const handel = (n: Node) => {
					callback(n);
					if (n instanceof Element) {
						Array.from(n.childNodes).forEach(handel);
						Array.from(n.attributes).forEach(callback);
					}
				};
				handel(root);
			})(node, (node) => {
				callback(node);
			});
		}
	};

	const domTranslator = new DOMTranslator({
		isTranslatableNode: Boolean,
		translateCallback: translator,
	});
	const parentDiv = document.createElement('div');
	parentDiv.innerHTML = 'Hello world!';
	const childDiv = document.createElement('div');
	childDiv.innerHTML = 'Hello world too!';
	parentDiv.append(childDiv);

	handleElementTree(parentDiv, domTranslator.translateNode);
	await awaitTranslation();

	domTranslator.restoreNode(parentDiv);

	// child node and target has not translated text
	expect(parentDiv.innerHTML).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(childDiv.innerHTML).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
});
