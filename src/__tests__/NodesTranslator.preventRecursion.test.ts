import { DOMNodesTranslator } from '../DOMNodesTranslator';
import { TranslationDispatcher } from '../TranslationDispatcher';
import {
	awaitTranslation,
	startsWithRegex,
	TRANSLATION_SYMBOL,
	translator,
} from './utils';
import { NodesTranslator, TranslatorInterface } from '..';

beforeEach(() => {
	document.body.innerHTML = '';
	vi.clearAllMocks();
});

function buildTranslationServices(translator: TranslatorInterface) {
	const translationSpy = vi.fn(translator);

	const domNodeTranslator = new DOMNodesTranslator(translationSpy);
	const dispatcher = new TranslationDispatcher({
		filter: () => true,
		nodesTranslator: domNodeTranslator,
	});
	const nodesTranslator = new NodesTranslator({
		dispatcher,
		nodesTranslator: domNodeTranslator,
	});

	return { nodesTranslator, translationSpy };
}

test('Translation of node does not trigger recursive translation', async () => {
	const { nodesTranslator, translationSpy } = buildTranslationServices(translator);

	const div = document.createElement('div');
	div.textContent = 'Simple text';
	document.body.appendChild(div);

	nodesTranslator.observe(div);
	await awaitTranslation();
	expect(div.textContent).toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	// translated without recursion
	await awaitTranslation();
	expect(translationSpy).toBeCalledTimes(1);
});

test('Updating a node does not trigger recursive translation', async () => {
	const { nodesTranslator, translationSpy } = buildTranslationServices(translator);

	const div = document.createElement('div');
	div.setAttribute('title', 'title text');
	document.body.appendChild(div);

	nodesTranslator.observe(div);
	await awaitTranslation();
	expect(div.getAttribute('title')).toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	// translated without recursion
	await awaitTranslation();
	expect(translationSpy).toBeCalledTimes(1);

	// update content, translate node without triggering recursion
	const text = 'new text';
	div.setAttribute('title', text);
	await awaitTranslation();
	expect(div.getAttribute('title')).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(div.getAttribute('title')).toContain(text);

	// translated on update, no recursion
	await awaitTranslation();
	expect(translationSpy).toBeCalledTimes(2);
});

test('Changes nodes not trigger recursive translation', async () => {
	const { nodesTranslator, translationSpy } = buildTranslationServices(translator);

	// create parent node
	const parentDiv = document.createElement('div');
	document.body.appendChild(parentDiv);

	nodesTranslator.observe(parentDiv);
	await awaitTranslation();

	expect(translationSpy).toBeCalledTimes(0);
	vi.clearAllMocks();

	// add empty element
	const div1 = document.createElement('div');
	parentDiv.appendChild(div1);

	await awaitTranslation();
	expect(translationSpy).toBeCalledTimes(0);
	vi.clearAllMocks();

	// add text in element
	const textNode1 = new Text('Simple text');
	parentDiv.appendChild(textNode1);

	await awaitTranslation();
	expect(textNode1.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(translationSpy).toBeCalledTimes(1);
	vi.clearAllMocks();

	// add element with text
	const div2 = document.createElement('div');
	const textNode2 = new Text('New text');
	div2.appendChild(textNode2);

	parentDiv.appendChild(div2);

	await awaitTranslation();
	expect(textNode2.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(translationSpy).toBeCalledTimes(1);
	vi.clearAllMocks();

	// text in element changed
	const text1 = 'Update text';
	textNode2.nodeValue = text1;
	await awaitTranslation();

	expect(textNode2.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(textNode2.nodeValue).toContain(text1);
	expect(translationSpy).toBeCalledTimes(1);
	vi.clearAllMocks();

	// add attribute
	const attrNode = document.createAttribute('title');
	attrNode.nodeValue = 'Title text';
	parentDiv.setAttributeNode(attrNode);

	await awaitTranslation();
	expect(attrNode.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(translationSpy).toBeCalledTimes(1);
	vi.clearAllMocks();

	// remove attribute
	parentDiv.removeAttributeNode(attrNode);
	await awaitTranslation();
	expect(translationSpy).toBeCalledTimes(0);
	vi.clearAllMocks();

	// removed text node
	parentDiv.removeChild(textNode1);
	await awaitTranslation();
	expect(translationSpy).toBeCalledTimes(0);
	vi.clearAllMocks();

	// removed element
	parentDiv.removeChild(div2);
	await awaitTranslation();
	expect(translationSpy).toBeCalledTimes(0);
	vi.clearAllMocks();

	await awaitTranslation();
	expect(translationSpy).toBeCalledTimes(0);
});
