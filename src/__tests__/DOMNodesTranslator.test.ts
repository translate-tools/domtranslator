import { DOMNodesTranslator } from '../DOMNodesTranslator';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL, translator } from './utils';

test('Translates a node and restores the original node text', async () => {
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

test('Stores original text on translation and clears it after restoration', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);
	const nodeText = 'Hello world!';
	const div = document.createElement('div');
	div.textContent = nodeText;

	// before translation
	expect(domNodesTranslator.getOriginalNodeText(div.childNodes[0])).toBe(null);

	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();

	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(domNodesTranslator.getOriginalNodeText(div.childNodes[0])).toBe(nodeText);

	// after restore
	domNodesTranslator.restoreNode(div.childNodes[0]);
	expect(div.textContent).toBe(nodeText);
	expect(domNodesTranslator.getOriginalNodeText(div.childNodes[0])).toBe(null);
});

test('Stores the node after translation and removes it after restoration', async () => {
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

test('UpdateNode method translates the modified node', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);
	const node = document.createElement('a');
	const text = 'title text';
	node.setAttribute('title', text);

	// translate
	domNodesTranslator.translateNode(node.attributes[0]);
	await awaitTranslation();
	expect(node.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// update value
	const text1 = 'title text is update';
	node.setAttribute('title', text1);

	domNodesTranslator.updateNode(node.attributes[0]);
	await awaitTranslation();
	expect(node.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(node.getAttribute('title')).toMatch(text1);

	domNodesTranslator.restoreNode(node.attributes[0]);
	expect(node.getAttribute('title')).toBe(text1);
});

test('Restores the most recent original text after multiple translations', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);
	const div = document.createElement('div');
	const nodeText = 'Hello world!';
	div.textContent = nodeText;

	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// change
	const nodeText1 = 'My name is Jake';
	div.textContent = nodeText1;
	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	domNodesTranslator.restoreNode(div.childNodes[0]);
	expect(div.textContent).toBe(nodeText1);
});
