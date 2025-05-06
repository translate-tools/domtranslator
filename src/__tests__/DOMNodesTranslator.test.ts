import { DOMNodesTranslator } from '../DOMNodesTranslator';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL, translator } from './utils';

test('Translate and restore original node text', async () => {
	const domNodesTranslator = new DOMNodesTranslator({
		isTranslatableNode: Boolean,
		translateCallback: translator,
	});

	const nodeText = 'Hello world!';
	const div = document.createElement('div');
	div.textContent = nodeText;

	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	domNodesTranslator.restoreNode(div.childNodes[0]);
	expect(div.textContent).toBe(nodeText);
});

test('Returns original text node', async () => {
	const domNodesTranslator = new DOMNodesTranslator({
		isTranslatableNode: Boolean,
		translateCallback: translator,
	});

	const nodeText = 'Hello world!';
	const div = document.createElement('div');
	div.textContent = nodeText;

	// node not translated, original text is null
	expect(domNodesTranslator.getOriginalNodeText(div.childNodes[0])).toBe(null);

	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();

	// node has been translated
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(domNodesTranslator.getOriginalNodeText(div.childNodes[0])).toEqual(nodeText);

	// reset translation
	domNodesTranslator.restoreNode(div.childNodes[0]);
	expect(div.textContent).toBe(nodeText);
	expect(domNodesTranslator.getOriginalNodeText(div.childNodes[0])).toBe(null);
});

test('Translated node exist in the storage', async () => {
	const domNodesTranslator = new DOMNodesTranslator({
		isTranslatableNode: Boolean,
		translateCallback: translator,
	});
	const div = document.createElement('div');
	div.textContent = 'Hello world!';
	// not exists before translate
	expect(domNodesTranslator.hasNode(div.childNodes[0])).toBe(false);

	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(domNodesTranslator.hasNode(div.childNodes[0])).toBe(true);

	domNodesTranslator.restoreNode(div.childNodes[0]);
	expect(domNodesTranslator.hasNode(div.childNodes[0])).toBe(false);
});

test('Calls updateNode when node content is updated', async () => {
	const domNodesTranslator = new DOMNodesTranslator({
		isTranslatableNode: Boolean,
		translateCallback: translator,
	});
	// spy on the updateNode method
	const updateNodesSpy = vi.spyOn(
		domNodesTranslator as DOMNodesTranslator,
		'updateNode',
	);

	const text = 'Hello world!';
	const div = document.createElement('div');
	div.innerHTML = text;

	// translate element
	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();

	// In the actual code the sequence of calls is as follows:
	// Node is translated -> the node's content is changed ->
	// Node update event is triggered -> the updateNode method is called with new translated content
	domNodesTranslator.updateNode(div.childNodes[0]);
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

test('Restored node contains the most recent content after several translations', async () => {
	const domNodesTranslator = new DOMNodesTranslator({
		isTranslatableNode: Boolean,
		translateCallback: translator,
	});
	const div = document.createElement('div');
	const nodeText = 'Hello world!';
	div.textContent = nodeText;

	// translate
	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(div.textContent).toMatch(nodeText);

	// translate again with changed text
	const nodeText1 = 'My name is Jake';
	div.textContent = nodeText1;
	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(div.textContent).toMatch(nodeText1);

	// restore, elements have the last updated text and have not translated
	domNodesTranslator.restoreNode(div.childNodes[0]);
	expect(div.textContent).toBe(nodeText1);
});
