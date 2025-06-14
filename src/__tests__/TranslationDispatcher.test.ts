import { DOMNodesTranslator } from '../DOMNodesTranslator';
import { NodesIntersectionObserver } from '../lib/NodesIntersectionObserver';
import { TranslationDispatcher } from '../TranslationDispatcher';
import { configureTranslatableNodePredicate } from '../utils/nodes';
import {
	awaitTranslation,
	containsRegex,
	mockBoundingClientRect,
	TRANSLATION_SYMBOL,
	translator,
} from './utils';

require('intersection-observer');

beforeEach(() => {
	document.body.innerHTML = '';
});

const isTranslatableNode = () => true;

test('In lazy-translation mode a non-intersecting node translates immediately', async () => {
	const translationDispatcher = new TranslationDispatcher({
		filter: isTranslatableNode,
		nodesTranslator: new DOMNodesTranslator(translator),
		nodesIntersectionObserver: new NodesIntersectionObserver(),
	});

	// OPTION node is not intersectable; it cannot be translated later
	const select = document.createElement('select');
	const option = document.createElement('option');
	option.textContent = 'Hello, world!';
	select.appendChild(option);
	document.body.appendChild(select);

	// element is outside the viewport
	// IntersectionObserver should not invoke the callback until the node appears in the viewport
	mockBoundingClientRect(option, { width: 50, height: 100, x: 0, y: 300 });
	mockBoundingClientRect(document.body, { width: 100, height: 200, x: 0, y: 0 });

	// the element is translated regardless of viewport intersection
	translationDispatcher.translateNode(select);
	await awaitTranslation();
	expect(option.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('In lazy-translation mode a node not attached to the body translates immediately', async () => {
	const translationDispatcher = new TranslationDispatcher({
		filter: isTranslatableNode,
		nodesTranslator: new DOMNodesTranslator(translator),
		nodesIntersectionObserver: new NodesIntersectionObserver(),
	});

	// the node is outside the document.body, it is not intersecteble and cannot be translated later
	const head = document.createElement('head');
	const title = document.createElement('title');
	title.textContent = 'Title text';
	head.appendChild(title);

	translationDispatcher.translateNode(head);
	await awaitTranslation();
	expect(title.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Translates and restores the element and its child elements', async () => {
	const translationDispatcher = new TranslationDispatcher({
		filter: isTranslatableNode,
		nodesTranslator: new DOMNodesTranslator(translator),
		nodesIntersectionObserver: new NodesIntersectionObserver(),
	});

	const div1 = document.createElement('div');
	const text1 = 'Would you like a cup of tea?';
	div1.textContent = text1;
	const div2 = document.createElement('div');
	const text2 = 'Hi! yes i would';
	div2.textContent = text2;
	div1.appendChild(div2);
	document.body.appendChild(div1);

	translationDispatcher.translateNode(div1);
	await awaitTranslation();
	// check the text on the element itself
	expect(div1.childNodes[0].textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(div2.childNodes[0].textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	translationDispatcher.restoreNode(div1);
	expect(div1.childNodes[0].textContent).toBe(text1);
	expect(div2.childNodes[0].textContent).toBe(text2);
});

test('Calls callback after restore node', async () => {
	const callback = vi.fn();
	const translationDispatcher = new TranslationDispatcher({
		filter: isTranslatableNode,
		nodesTranslator: new DOMNodesTranslator(translator),
		nodesIntersectionObserver: new NodesIntersectionObserver(),
	});

	const div = document.createElement('div');
	const text = 'Hello world';
	div.textContent = text;
	document.body.appendChild(div);

	// translate
	translationDispatcher.translateNode(div);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// restore
	translationDispatcher.restoreNode(div, callback);
	expect(div.textContent).toBe(text);
	expect(callback.mock.calls[0][0]).toEqual(div.childNodes[0]);
});

test('Does not translate ignored node', async () => {
	const filter = configureTranslatableNodePredicate({
		ignoredSelectors: ['comment'],
	});
	const translationDispatcher = new TranslationDispatcher({
		filter,
		nodesTranslator: new DOMNodesTranslator(translator),
		nodesIntersectionObserver: new NodesIntersectionObserver(),
	});

	const div = document.createElement('div');
	div.textContent = 'I`m container node';
	const text = 'I`m comment node';
	const comment = document.createComment(text);
	div.appendChild(comment);
	document.body.appendChild(div);

	translationDispatcher.translateNode(div);
	await awaitTranslation();

	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// comment not translated
	expect(comment.textContent).toBe(text);
});
