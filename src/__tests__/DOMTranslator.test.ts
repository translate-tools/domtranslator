import { DOMNodesTranslator } from '../DOMNodesTranslator';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL, translator } from './utils';

test('Translate and restore original node text', async () => {
	const domTranslator = new DOMNodesTranslator({
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
	const domTranslator = new DOMNodesTranslator({
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
	const domTranslator = new DOMNodesTranslator({
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
	const domTranslator = new DOMNodesTranslator({
		isTranslatableNode: Boolean,
		translateCallback: translator,
	});
	// spy on the updateNode method
	const updateNodesSpy = vi.spyOn(domTranslator as DOMNodesTranslator, 'updateNode');

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
	const domTranslator = new DOMNodesTranslator({
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
