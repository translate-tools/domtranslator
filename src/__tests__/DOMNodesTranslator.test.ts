import { DOMNodesTranslator } from '../DOMNodesTranslator';
import {
	awaitTranslation,
	containsRegex,
	delay,
	TRANSLATION_SYMBOL,
	translator,
} from './utils';

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

test('Stores original node text on translation and clears it after restoration', async () => {
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
	const text = 'Hello world!';
	const div = document.createElement('div');
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
	const div = document.createElement('div');
	const text1 = 'title text';
	div.setAttribute('title', text1);

	// translate
	domNodesTranslator.translateNode(div.attributes[0]);
	await awaitTranslation();
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// update value
	const text2 = 'title text is update';
	div.setAttribute('title', text2);

	domNodesTranslator.updateNode(div.attributes[0]);
	await awaitTranslation();

	// check that the node value is the translated new value
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(div.getAttribute('title')).toMatch(text2);

	domNodesTranslator.restoreNode(div.attributes[0]);
	expect(div.getAttribute('title')).toBe(text2);
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

	// first slow translation (300ms)
	domNodesTranslator.translateNode(div.attributes[0], callback);

	// waiting (less then 300 ms); the translation is not completed yet, callback should not be called
	await delay(100);
	await awaitTranslation();
	expect(callback).toBeCalledTimes(0);
	expect(div.getAttribute('title')).toBe(text1);

	// second fast translation (100ms)
	div.setAttribute('title', 'Hi friends!');
	domNodesTranslator.updateNode(div.attributes[0], callback);

	// waiting (more then 100 ms), the translation is complete and the callback should be called
	await delay(100);
	await awaitTranslation();
	expect(callback).toBeCalledTimes(1);
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// wait for the first translation to finish. Callback should not be called again
	await delay(200);
	await awaitTranslation();
	expect(callback).toBeCalledTimes(1);
});
