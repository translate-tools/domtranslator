import { DOMNodesTranslator } from '../DOMNodesTranslator';
import { NodesIntersectionObserver } from '../NodesIntersectionObserver';
import { TranslationDispatcher } from '../TranslationDispatcher';
import { configureTranslatableNodePredicate } from '../utils/nodes';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL, translator } from './utils';

require('intersection-observer');

beforeEach(() => {
	vi.clearAllMocks();
	document.body.innerHTML = '';
});

const isTranslatableNode = () => true;

test('Translate node that is not suitable for delayed translation', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);

	const translationDispatcher = new TranslationDispatcher({
		filter: isTranslatableNode,
		nodeTranslator: domNodesTranslator,
		nodeIntersectionObserver: new NodesIntersectionObserver(),
	});

	// OPTION node is not intersectable, node can`t translate latter
	const select = document.createElement('select');
	const option = document.createElement('option');
	option.textContent = 'Hello, world!';
	select.appendChild(option);
	document.body.appendChild(select);

	translationDispatcher.translateNode(select);
	await awaitTranslation();

	expect(option.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Translate node from shadowDom ', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);

	const translationDispatcher = new TranslationDispatcher({
		filter: isTranslatableNode,
		nodeTranslator: domNodesTranslator,
		nodeIntersectionObserver: new NodesIntersectionObserver(),
	});

	const host = document.createElement('div');
	document.body.appendChild(host);
	const shadowRoot = host.attachShadow({ mode: 'open' });

	// this node not attached to DOM, but should be translated
	const div = document.createElement('div');
	const text = 'I`m from shadow';
	div.textContent = text;
	shadowRoot.appendChild(div);

	translationDispatcher.translateNode(host);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// restore
	translationDispatcher.restoreNode(host);
	expect(div.textContent).toBe(text);
});

test('Translates and restores the element and its child elements', async () => {
	const div = document.createElement('div');
	const text = 'Would you like a cup of tea?';
	div.textContent = text;
	const div1 = document.createElement('div');
	const text1 = 'Hi! yes i would';
	div1.textContent = text1;
	div.appendChild(div1);
	document.body.appendChild(div);

	const domNodesTranslator = new DOMNodesTranslator(translator);
	const translationDispatcher = new TranslationDispatcher({
		filter: isTranslatableNode,
		nodeTranslator: domNodesTranslator,
	});

	translationDispatcher.translateNode(div);
	await awaitTranslation();
	// check text on the element itself
	expect(div.childNodes[0].textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(div1.childNodes[0].textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	translationDispatcher.restoreNode(div);
	await awaitTranslation();
	expect(div.childNodes[0].textContent).toBe(text);
	expect(div1.childNodes[0].textContent).toBe(text1);
});

test('Do not translate ignored node inside element', async () => {
	const filter = configureTranslatableNodePredicate({
		ignoredSelectors: ['comment'],
	});
	const nodeTranslator = new DOMNodesTranslator(translator);
	const translationDispatcher = new TranslationDispatcher({
		filter,
		nodeTranslator,
		nodeIntersectionObserver: new NodesIntersectionObserver(),
	});

	const div = document.createElement('div');
	div.textContent = 'I`m block i have four corners';
	const comment = document.createComment('I`m comment node, not translate me please');
	const p = document.createElement('p');
	p.textContent = 'I have text, i would be translated';
	div.appendChild(p);
	div.appendChild(comment);
	document.body.appendChild(div);

	translationDispatcher.translateNode(div);
	await awaitTranslation();

	expect(div.childNodes[0].textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(p.childNodes[0].textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	// comment not translated
	expect(comment.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
});
