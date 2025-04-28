import { DOMTranslator } from '../DOMTranslator';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL, translator } from './utils';

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

beforeEach(() => {
	vi.clearAllMocks();
});

test('Translate and restore original element text', async () => {
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

test('Get original node text', async () => {
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

test('Not translate empty element', async () => {
	const domTranslator = new DOMTranslator({
		isTranslatableNode: Boolean,
		translateCallback: translator,
	});

	const div = document.createElement('div');
	div.innerHTML = ' ';

	// translate
	domTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();

	expect(div.childNodes[0].textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Checks existing element in storage', async () => {
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

test('Update translation for element', async () => {
	const domTranslator = new DOMTranslator({
		isTranslatableNode: Boolean,
		translateCallback: translator,
	});
	// spy on the updateNode method
	const updateNodesSpy = vi.spyOn(domTranslator as DOMTranslator, 'updateNode');

	const text = 'Hello world!';
	const textNode = document.createTextNode(text);

	// translate element
	domTranslator.translateNode(textNode);
	await awaitTranslation();

	// In the actual code the sequence of calls is as follows:
	// Node is translated -> the node's content is changed ->
	// Node update event is triggered -> the updateNode method is called with new translated content
	domTranslator.updateNode(textNode);
	await awaitTranslation();

	// update calls one time
	expect(updateNodesSpy).toBeCalledTimes(1);
	expect(updateNodesSpy.mock.calls[0][0].nodeValue).toMatch(text);
	expect(updateNodesSpy.mock.calls[0][0].nodeValue).toMatch(
		containsRegex(TRANSLATION_SYMBOL),
	);
});

test('Restore the text element after a few translations', async () => {
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

test('Delete translation only from target element', async () => {
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

	domTranslator.restoreNode(parentDiv.childNodes[0], true);

	//target element has not translation
	expect(parentDiv.childNodes[0].textContent).not.toMatch(
		containsRegex(TRANSLATION_SYMBOL),
	);
	// child element still has translation
	expect(childDiv.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));
});
