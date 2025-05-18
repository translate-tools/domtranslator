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

test('Stores original text on translation and clears it on restoration', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);

	const nodeText = 'Hello world!';
	const div = document.createElement('div');
	div.textContent = nodeText;

	// before translation
	expect(domNodesTranslator.getOriginalNodeText(div.childNodes[0])).toBe(null);

	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();

	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(domNodesTranslator.getOriginalNodeText(div.childNodes[0])).toEqual(nodeText);

	// after restore
	domNodesTranslator.restoreNode(div.childNodes[0]);
	expect(div.textContent).toBe(nodeText);
	expect(domNodesTranslator.getOriginalNodeText(div.childNodes[0])).toBe(null);
});

test('Stores node during translation and removes it upon restoration', async () => {
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

test('Translates the attribute node text after its value is changed', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);

	const node = document.createElement('a');
	node.setAttribute('title', 'title text');

	// translate the attribute node
	domNodesTranslator.translateNode(node.attributes[0]);
	await awaitTranslation();
	expect(node.attributes[0].textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// the first call to updateNode updates the internal updateId state,
	// but the node won't be translated immediately because the updateId matches the translate context.
	// this prevents recursive translation calls.
	const text1 = 'title text is update';
	node.setAttribute('title', text1);
	domNodesTranslator.updateNode(node.attributes[0]);
	await awaitTranslation();

	// the second call to updateNode triggers the actual translation of the node text
	domNodesTranslator.updateNode(node.attributes[0]);
	await awaitTranslation();
	expect(node.attributes[0].textContent).toMatch(text1);
	expect(node.attributes[0].textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Restores the most recent original text after multiple translations', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);

	const div = document.createElement('div');
	const nodeText = 'Hello world!';
	div.textContent = nodeText;

	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// change text
	const nodeText1 = 'My name is Jake';
	div.textContent = nodeText1;
	domNodesTranslator.translateNode(div.childNodes[0]);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// restore: elements have the last updated text and are not translated
	domNodesTranslator.restoreNode(div.childNodes[0]);
	expect(div.textContent).toBe(nodeText1);
});
