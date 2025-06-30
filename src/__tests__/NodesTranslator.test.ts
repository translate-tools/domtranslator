import { NodesTranslator } from '../NodesTranslator';
import {
	awaitTranslation,
	delay,
	startsWithRegex,
	TRANSLATION_SYMBOL,
	translator,
} from './utils';

test('Translates a node and restores the original node text', async () => {
	const nodesTranslator = new NodesTranslator(translator);
	const text = 'Hello world!';
	const node = new Text(text);

	nodesTranslator.process(node);
	await awaitTranslation();
	expect(node.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	nodesTranslator.restore(node);
	expect(node.nodeValue).toBe(text);
});

test('Stores original node text on translation and clears it after restoration', async () => {
	const nodesTranslator = new NodesTranslator(translator);
	const text = 'Hello world!';
	const node = new Text(text);

	// before translation
	expect(nodesTranslator.getState(node)).toBe(null);

	nodesTranslator.process(node);
	await awaitTranslation();

	expect(node.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(nodesTranslator.getState(node)).toStrictEqual({ originalText: text });

	// after restore
	nodesTranslator.restore(node);
	expect(node.nodeValue).toBe(text);
	expect(nodesTranslator.getState(node)).toBe(null);
});

test('hasNode returns true if node is currently translated and false if not', async () => {
	const nodesTranslator = new NodesTranslator(translator);
	const text = 'Hello world!';
	const node = new Text(text);

	// not exists before translate
	expect(nodesTranslator.has(node)).toBe(false);

	nodesTranslator.process(node);
	await awaitTranslation();
	expect(node.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(nodesTranslator.has(node)).toBe(true);

	nodesTranslator.restore(node);
	expect(node.nodeValue).toBe(text);
	expect(nodesTranslator.has(node)).toBe(false);
});

test('updateNode method translates the modified node', async () => {
	const nodesTranslator = new NodesTranslator(translator);
	const text1 = 'title text';
	const attrNode = document.createAttribute('title');
	attrNode.nodeValue = text1;

	// translate
	nodesTranslator.process(attrNode);
	await awaitTranslation();
	expect(attrNode.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	// update value
	const text2 = 'title text is updated';
	attrNode.nodeValue = text2;

	nodesTranslator.update(attrNode);
	await awaitTranslation();

	// check that the node value is the translated new value
	expect(attrNode.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(attrNode.nodeValue).toContain(text2);

	nodesTranslator.restore(attrNode);
	expect(attrNode.nodeValue).toBe(text2);
});

test('Calls the callback after a node is translated and updated', async () => {
	const callback = vi.fn();

	const nodesTranslator = new NodesTranslator(translator);
	const text1 = 'title text';
	const attrNode = document.createAttribute('title');
	attrNode.nodeValue = text1;

	nodesTranslator.process(attrNode, callback);
	await awaitTranslation();

	expect(attrNode.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(callback.mock.calls).toEqual([[attrNode]]);

	const text2 = 'update title text';
	attrNode.nodeValue = text2;

	nodesTranslator.update(attrNode, callback);
	await awaitTranslation();

	expect(attrNode.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(attrNode.nodeValue).toContain(text2);
	expect(callback.mock.calls).toEqual([[attrNode], [attrNode]]);
});

test('updateNode throws an error when called on a node that was never translated', async () => {
	const callback = vi.fn();

	const nodesTranslator = new NodesTranslator(translator);
	const text = 'title text';
	const attrNode = document.createAttribute('title');
	attrNode.nodeValue = text;

	// the node was not translated
	expect(() => {
		nodesTranslator.update(attrNode, callback);
	}).toThrowError();
});

test('translateNode throws an error when called on the same node more than once', async () => {
	const callback = vi.fn();

	const nodesTranslator = new NodesTranslator(translator);
	const text = 'title text';
	const attrNode = document.createAttribute('title');
	attrNode.nodeValue = text;

	nodesTranslator.process(attrNode, callback);
	await awaitTranslation();

	expect(attrNode.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(callback.mock.calls).toEqual([[attrNode]]);

	await awaitTranslation();
	expect(() => nodesTranslator.process(attrNode, callback)).toThrowError();
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

	const nodesTranslator = new NodesTranslator(translatorWithDelay);
	const text1 = 'title text';
	const attrNode = document.createAttribute('title');
	attrNode.nodeValue = text1;

	// first slow translation (300ms)
	nodesTranslator.process(attrNode, callback);

	// waiting (less then 300 ms); the translation is not completed yet, callback should not be called
	await delay(100);
	await awaitTranslation();
	expect(callback).toBeCalledTimes(0);
	expect(attrNode.nodeValue).toBe(text1);

	// second fast translation (100ms)
	const text2 = 'Hi friends!';
	attrNode.nodeValue = text2;
	nodesTranslator.update(attrNode, callback);

	// waiting (more then 100 ms), the translation is complete and the callback should be called
	await delay(100);
	await awaitTranslation();
	expect(callback).toBeCalledTimes(1);
	expect(attrNode.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(attrNode.nodeValue).toContain(text2);

	// wait for the first translation to finish. Callback should not be called again
	await delay(200);
	await awaitTranslation();
	expect(callback).toBeCalledTimes(1);

	// all translation was resolved
	await expect(
		Promise.all(translatorWithDelay.mock.results.map((r) => r.value)),
	).resolves.toHaveLength(2);
});
