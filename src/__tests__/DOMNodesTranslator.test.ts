import { DOMNodesTranslator } from '../DOMNodesTranslator';
import {
	awaitTranslation,
	delay,
	startsWithRegex,
	TRANSLATION_SYMBOL,
	translator,
} from './utils';

function getAttributeNode(node: Element, attrName: string) {
	const attrNode = node.getAttributeNode(attrName);
	if (!attrNode) throw new Error('Not found node for test');
	return attrNode;
}

test('Translates a node and restores the original node text', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);
	const text = 'Hello world!';
	const node = new Text(text);

	domNodesTranslator.translateNode(node);
	await awaitTranslation();
	expect(node.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	domNodesTranslator.restoreNode(node);
	expect(node.nodeValue).toBe(text);
});

test('Stores original node text on translation and clears it after restoration', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);
	const text = 'Hello world!';
	const node = new Text(text);

	// before translation
	expect(domNodesTranslator.getOriginalNodeText(node)).toBe(null);

	domNodesTranslator.translateNode(node);
	await awaitTranslation();

	expect(node.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(domNodesTranslator.getOriginalNodeText(node)).toBe(text);

	// after restore
	domNodesTranslator.restoreNode(node);
	expect(node.nodeValue).toBe(text);
	expect(domNodesTranslator.getOriginalNodeText(node)).toBe(null);
});

test('hasNode returns true if node is currently translated and false if not', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);
	const text = 'Hello world!';
	const node = new Text(text);

	// not exists before translate
	expect(domNodesTranslator.hasNode(node)).toBe(false);

	domNodesTranslator.translateNode(node);
	await awaitTranslation();
	expect(node.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(domNodesTranslator.hasNode(node)).toBe(true);

	domNodesTranslator.restoreNode(node);
	expect(node.nodeValue).toBe(text);
	expect(domNodesTranslator.hasNode(node)).toBe(false);
});

test('updateNode method translates the modified node', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);
	const text1 = 'title text';
	const attrNode = document.createAttribute('title');
	attrNode.nodeValue = text1;

	// translate
	domNodesTranslator.translateNode(attrNode);
	await awaitTranslation();
	expect(attrNode.value).toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	// update value
	const text2 = 'title text is update';
	attrNode.nodeValue = text2;

	domNodesTranslator.updateNode(attrNode);
	await awaitTranslation();

	// check that the node value is the translated new value
	expect(attrNode.value).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(attrNode.value).toContain(text2);

	domNodesTranslator.restoreNode(attrNode);
	expect(attrNode.value).toBe(text2);
});

test('Calls the callback after a node is translated and updated', async () => {
	const callback = vi.fn();

	const domNodesTranslator = new DOMNodesTranslator(translator);
	const text1 = 'title text';
	const attrNode = document.createAttribute('title');
	attrNode.nodeValue = text1;

	domNodesTranslator.translateNode(attrNode, callback);
	await awaitTranslation();

	expect(attrNode.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(callback.mock.calls).toEqual([[attrNode]]);

	const text2 = 'update title text';
	attrNode.nodeValue = text2;

	domNodesTranslator.updateNode(attrNode, callback);
	await awaitTranslation();

	expect(attrNode.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(attrNode.nodeValue).toContain(text2);
	expect(callback.mock.calls).toEqual([[attrNode], [attrNode]]);
});

test('A callback passed to updateNode is not called for nodes that were never translated', async () => {
	const callback = vi.fn();

	const domNodesTranslator = new DOMNodesTranslator(translator);
	const text = 'title text';
	const attrNode = document.createAttribute('title');
	attrNode.nodeValue = text;

	// the node was not translated
	domNodesTranslator.updateNode(attrNode, callback);
	await awaitTranslation();
	expect(attrNode.value).toBe(text);
	expect(callback.mock.calls).toEqual([]);
});

test('Callback is not called when translating the same node again', async () => {
	const callback = vi.fn();

	const domNodesTranslator = new DOMNodesTranslator(translator);
	const text = 'title text';
	const attrNode = document.createAttribute('title');
	attrNode.nodeValue = text;

	domNodesTranslator.translateNode(attrNode, callback);
	await awaitTranslation();

	expect(attrNode.value).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(callback.mock.calls).toEqual([[attrNode]]);

	await awaitTranslation();
	expect(domNodesTranslator.translateNode(attrNode, callback)).toThrowError();

	// TODO: check exception
});

test('Callback is called only once after latest completed translation', async () => {
	const callback = vi.fn();

	// first translation call resolves after 300 ms, second — after 100 ms
	const translatorWithDelay = vi
		.fn()
		.mockImplementationOnce(
			(text: string) =>
				new Promise((res) => setTimeout(() => res(translator(text)), 300)),
		)
		.mockImplementationOnce(
			(text: string) =>
				new Promise((res) => setTimeout(() => res(translator(text)), 100)),
		);

	const domNodesTranslator = new DOMNodesTranslator(translatorWithDelay);
	const div = document.createElement('div');
	const text1 = 'Hello world!';
	div.setAttribute('title', text1);

	const attrNode = getAttributeNode(div, 'title');

	// first slow translation (300ms)
	domNodesTranslator.translateNode(attrNode, callback);

	// waiting (less then 300 ms); the translation is not completed yet, callback should not be called
	await delay(100);
	await awaitTranslation();
	expect(callback).toBeCalledTimes(0);
	expect(attrNode.value).toBe(text1);

	// second fast translation (100ms)
	const text2 = 'Hi friends!';
	div.setAttribute('title', text2);
	domNodesTranslator.updateNode(attrNode, callback);

	// waiting (more then 100 ms), the translation is complete and the callback should be called
	await delay(100);
	await awaitTranslation();
	expect(callback).toBeCalledTimes(1);
	expect(attrNode.value).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(attrNode.value).toContain(text2);

	// the second (fast translation) was resolved
	await expect(translatorWithDelay.mock.results[1].value).resolves.toBeDefined();

	// wait for the first translation to finish. Callback should not be called again
	await delay(200);
	await awaitTranslation();
	expect(callback).toBeCalledTimes(1);

	// all translation was resolved
	expect(translatorWithDelay.mock.results).toHaveLength(2);

	// the first (slow translation) was resolved
	await expect(translatorWithDelay.mock.results[0].value).resolves.toBeDefined();
});
