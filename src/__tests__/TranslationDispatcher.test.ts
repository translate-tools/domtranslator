import { DOMNodesTranslator } from '../DOMNodesTranslator';
import { NodesIntersectionObserver } from '../NodesIntersectionObserver';
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
	mockBoundingClientRect(document.body, { width: 0, height: 0, x: 0, y: 0 });
	document.body.innerHTML = '';
});

const isTranslatableNode = () => true;

test('In lazy-translation mode a non-intersecting node translates immediately', async () => {
	const translationDispatcher = new TranslationDispatcher({
		filter: isTranslatableNode,
		nodeTranslator: new DOMNodesTranslator(translator),
		nodeIntersectionObserver: new NodesIntersectionObserver(),
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
	translationDispatcher.translateNode(select, () => {});
	await awaitTranslation();
	expect(option.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('In lazy-translation mode a node not attached to the body translates immediately', async () => {
	const domNodesTranslator = new DOMNodesTranslator(translator);
	const translationDispatcher = new TranslationDispatcher({
		filter: isTranslatableNode,
		nodeTranslator: domNodesTranslator,
		nodeIntersectionObserver: new NodesIntersectionObserver(),
	});

	// the node is outside the document.body, it is not intersecteble and cannot be translated later
	const head = document.createElement('head');
	const title = document.createElement('title');
	const text = 'Title can contain only text';
	title.textContent = text;
	head.appendChild(title);

	translationDispatcher.translateNode(head, () => {});
	await awaitTranslation();
	expect(title.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
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

	const translationDispatcher = new TranslationDispatcher({
		filter: isTranslatableNode,
		nodeTranslator: new DOMNodesTranslator(translator),
	});

	translationDispatcher.translateNode(div, () => {});
	await awaitTranslation();
	// check the text on the element itself
	expect(div.childNodes[0].textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(div1.childNodes[0].textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	translationDispatcher.restoreNode(div);
	expect(div.childNodes[0].textContent).toBe(text);
	expect(div1.childNodes[0].textContent).toBe(text1);
});

test('Does not translate ignored node', async () => {
	const filter = configureTranslatableNodePredicate({
		ignoredSelectors: ['comment'],
	});
	const translationDispatcher = new TranslationDispatcher({
		filter,
		nodeTranslator: new DOMNodesTranslator(translator),
	});

	const div = document.createElement('div');
	div.textContent = 'I`m block i have four corners';
	const comment = document.createComment('I`m comment node, not translate me please');
	const p = document.createElement('p');
	p.textContent = 'I have text, i would be translated';
	div.appendChild(p);
	div.appendChild(comment);
	document.body.appendChild(div);

	translationDispatcher.translateNode(div, () => {});
	await awaitTranslation();

	expect(div.childNodes[0].textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(p.childNodes[0].textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	// comment not translated
	expect(comment.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
});
