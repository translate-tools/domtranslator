import { DOMNodesTranslator } from '../DOMNodesTranslator';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL, translator } from './utils';

test('Translate and restore original node text', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);

	const nodeText = 'Hello world!';
	const div = document.createElement('div');
	div.textContent = nodeText;

	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	domNodesTranslator.restoreNode(div.childNodes[0]);
	expect(div.textContent).toBe(nodeText);
});

test('Stores original text on translation and clears it on restoration', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);

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
	const domNodesTranslator = new DOMNodesTranslator(translator);

	const div = document.createElement('div');
	const nodeText = 'Hello world!';
	div.textContent = nodeText;
	// not exists before translate
	expect(domNodesTranslator.hasNode(div.childNodes[0])).toBe(false);

	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(domNodesTranslator.hasNode(div.childNodes[0])).toBe(true);

	domNodesTranslator.restoreNode(div.childNodes[0]);
	expect(div.textContent).toBe(nodeText);
	expect(domNodesTranslator.hasNode(div.childNodes[0])).toBe(false);
});

test('Translate the node after updating its text', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);

	const node = document.createElement('a');
	node.setAttribute('title', 'title text');

	// translate element
	domNodesTranslator.translateNode(node.attributes[0]);
	await awaitTranslation();
	expect(node.attributes[0].textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// the first call updateNode will update the updateId state, but the node won’t be translated
	// because the internal state updateId will be equal to translateContext, this approach prevent recursion translation
	const text1 = 'title text is update';
	node.setAttribute('title', text1);
	domNodesTranslator.updateNode(node.attributes[0]);
	await awaitTranslation();

	// this call will translate node text
	domNodesTranslator.updateNode(node.attributes[0]);
	await awaitTranslation();
	expect(node.attributes[0].textContent).toMatch(text1);
	expect(node.attributes[0].textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Restored node contains the most recent content after several translations', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);

	const div = document.createElement('div');
	const nodeText = 'Hello world!';
	div.textContent = nodeText;

	// translate
	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// translate again with changed text
	const nodeText1 = 'My name is Jake';
	div.textContent = nodeText1;
	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// restore, elements have the last updated text and have not translated
	domNodesTranslator.restoreNode(div.childNodes[0]);
	expect(div.textContent).toBe(nodeText1);
});
