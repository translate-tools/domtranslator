import { DOMNodesTranslator } from '../DOMNodesTranslator';
import {
	awaitTranslation,
	containsRegex,
	delay,
	TRANSLATION_SYMBOL,
	translator,
	translatorMockWithDelays,
} from './utils';

test('Callback is called only after successful translation', async () => {
	const callback = vi.fn();

	const domNodesTranslator = new DOMNodesTranslator(translatorMockWithDelays);
	const text = 'Hello world!';
	const div = document.createElement('div');
	div.textContent = text;

	// first translation call resolves after 300 ms, second — after 100 ms

	// first slow translation (300ms)
	domNodesTranslator.translateNode(div.childNodes[0], callback);

	// waiting 100ms: the translation is not completed yet, callback should not be called
	await delay(100);
	await awaitTranslation();
	expect(callback).toBeCalledTimes(0);
	expect(div.textContent).toBe(text);

	// second fast translation (100ms)
	const text2 = 'Hi friends!';
	div.setAttribute('title', text2);
	domNodesTranslator.updateNode(div.childNodes[0], callback);

	// waiting 100 ms: the translation is complete and the callback should be called
	await delay(100);
	await awaitTranslation();
	expect(callback).toBeCalledTimes(1);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// wait for the first translation to finish. Callback should not be called again
	await delay(200);
	await awaitTranslation();
	expect(callback).toBeCalledTimes(1);
});

test('Translates a node and restores the original node text', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);
	const text = 'Hello world!';
	const div = document.createElement('div');
	div.textContent = text;

	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	domNodesTranslator.restoreNode(div.childNodes[0]);
	expect(div.textContent).toBe(text);
});

test('Stores original text on translation and clears it after restoration', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);
	const text = 'Hello world!';
	const div = document.createElement('div');
	div.textContent = text;

	// before translation
	expect(domNodesTranslator.getOriginalNodeText(div.childNodes[0])).toBe(null);

	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();

	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(domNodesTranslator.getOriginalNodeText(div.childNodes[0])).toBe(text);

	// after restore
	domNodesTranslator.restoreNode(div.childNodes[0]);
	expect(div.textContent).toBe(text);
	expect(domNodesTranslator.getOriginalNodeText(div.childNodes[0])).toBe(null);
});

test('Stores the node after translation and removes it after restoration', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);
	const div = document.createElement('div');
	const text = 'Hello world!';
	div.textContent = text;

	// not exists before translate
	expect(domNodesTranslator.hasNode(div.childNodes[0])).toBe(false);

	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(domNodesTranslator.hasNode(div.childNodes[0])).toBe(true);

	domNodesTranslator.restoreNode(div.childNodes[0]);
	expect(div.textContent).toBe(text);
	expect(domNodesTranslator.hasNode(div.childNodes[0])).toBe(false);
});

test('UpdateNode method translates the modified node', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);
	const node = document.createElement('a');
	const text1 = 'title text';
	node.setAttribute('title', text1);

	// translate
	domNodesTranslator.translateNode(node.attributes[0]);
	await awaitTranslation();
	expect(node.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// update value
	const text2 = 'title text is update';
	node.setAttribute('title', text2);

	domNodesTranslator.updateNode(node.attributes[0]);
	await awaitTranslation();
	expect(node.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(node.getAttribute('title')).toMatch(text2);

	domNodesTranslator.restoreNode(node.attributes[0]);
	expect(node.getAttribute('title')).toBe(text2);
});

test('Restores the most recent original text after multiple translations', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);
	const div = document.createElement('div');
	div.textContent = 'Hello world!';

	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// change
	const text = 'My name is Jake';
	div.textContent = text;
	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	domNodesTranslator.restoreNode(div.childNodes[0]);
	expect(div.textContent).toBe(text);
});
