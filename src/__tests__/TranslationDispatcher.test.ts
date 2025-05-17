import { DOMNodesTranslator } from '../DOMNodesTranslator';
import { NodesIntersectionObserver } from '../NodesIntersectionObserver';
import { TranslationDispatcher } from '../TranslationDispatcher';
import { configureTranslatableNodePredicate } from '../utils/nodes';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL, translator } from './utils';

require('intersection-observer');

// const lazyTranslatorSpy = vi.spyOn(IntersectionObserverWithFilter.prototype, 'attach');

beforeEach(() => {
	vi.clearAllMocks();
	document.body.innerHTML = '';
});

const isTranslatableNode = () => true;

test('Translate immediately if node is not eligible for lazy translation', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);

	const translationDispatcher = new TranslationDispatcher({
		filter: isTranslatableNode,
		nodeTranslator: domNodesTranslator,
		lazyTranslator: new NodesIntersectionObserver(),
	});

	// OPTION node is not intersectable, node can`t translate 'lazy'
	const select = document.createElement('select');
	const option = document.createElement('option');
	option.textContent = 'Hello, world!';
	select.appendChild(option);
	document.body.appendChild(select);

	translationDispatcher.translateNode(select);
	await awaitTranslation();

	// lazy translator not called
	// expect(lazyTranslatorSpy.mock.calls).toEqual([]);
	// translate immediately
	expect(option.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Lazily translate intersectable node', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);
	const translationDispatcher = new TranslationDispatcher({
		filter: isTranslatableNode,
		nodeTranslator: domNodesTranslator,
		lazyTranslator: new NodesIntersectionObserver(),
	});

	const div = document.createElement('div');
	div.textContent = 'Hello, world!';
	document.body.appendChild(div);
	translationDispatcher.translateNode(div);
	await awaitTranslation();

	// lazy translator called and translated element
	// expect(lazyTranslatorSpy.mock.calls).toEqual([[div]]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
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

test('Do not translate ignored node inside element during lazyTranslation', async () => {
	const filter = configureTranslatableNodePredicate({
		ignoredSelectors: ['comment'],
	});
	const nodeTranslator = new DOMNodesTranslator(translator);
	const translationDispatcher = new TranslationDispatcher({
		filter,
		nodeTranslator,
		lazyTranslator: new NodesIntersectionObserver(),
	});

	const div = document.createElement('div');
	div.textContent = 'I`m block i have four corners';
	const comment = document.createComment('I`m comment node, not translate me please');
	div.appendChild(comment);
	document.body.appendChild(div);

	// IntersectionObserverWithFilter receives a div element containing a comment that should not be translated
	translationDispatcher.translateNode(div);
	await awaitTranslation();

	// call IntersectionObserverWithFilter with element
	// expect(lazyTranslatorSpy.mock.calls).toEqual([[div]]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	// comment not translated
	expect(comment.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
});
