import {
	awaitTranslation,
	mockBoundingClientRect,
	startsWithRegex,
	TRANSLATION_SYMBOL,
} from '../__tests__/utils';
import { NodesIntersectionObserver } from './NodesIntersectionObserver';

require('intersection-observer');

const translator = vi.fn().mockImplementation(async (node: Node) => {
	node.textContent = TRANSLATION_SYMBOL + node.textContent;
});

beforeEach(() => {
	mockBoundingClientRect(document.body, {
		width: 100,
		height: 100,
		x: 0,
		y: 0,
	});
	document.body.textContent = '';
	vi.clearAllMocks();
});

test('Triggers callback for node in viewport', async () => {
	const textNode = new Text('Hello, World!');
	document.body.appendChild(textNode);

	const lazyTranslator = new NodesIntersectionObserver();

	lazyTranslator.observe(textNode, translator);
	await awaitTranslation();

	// The mock function was called once
	expect(translator.mock.calls).toEqual([[textNode]]);
	expect(textNode.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
});

test('Triggers callback for a node only when it becomes intersectable', async () => {
	const lazyTranslator = new NodesIntersectionObserver();

	// node with display = 'none' is not intersectable
	// node with visibility: 'hidden' is considered intersectable, so use display: 'none' instead
	const div = document.createElement('div');
	div.textContent = 'Hello, world';
	div.style.display = 'none';
	document.body.appendChild(div);

	const textNode = div.childNodes[0];

	lazyTranslator.observe(textNode, translator);
	await awaitTranslation();

	expect(translator.mock.calls).toEqual([]);
	expect(textNode.nodeValue).not.toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	// the node becomes visible and is translated
	div.style.display = 'block';
	await awaitTranslation();

	expect(translator.mock.calls).toEqual([[textNode]]);
	expect(textNode.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
});

test('Does not trigger callback after node is detached', async () => {
	const lazyTranslator = new NodesIntersectionObserver();

	// node with display: none is not intersectable
	const div = document.createElement('div');
	div.textContent = 'Hello world!';
	div.style.display = 'none';
	document.body.appendChild(div);

	const textNode = div.childNodes[0];

	lazyTranslator.observe(textNode, translator);
	await awaitTranslation();

	// does not translate because node is not visible
	expect(translator.mock.calls).toEqual([]);
	expect(textNode.nodeValue).not.toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	// node is detached
	lazyTranslator.unobserve(textNode);

	// becomes visible and intersectable, but still does not translate after being detached
	div.style.display = 'block';
	await awaitTranslation();
	expect(translator.mock.calls).toEqual([]);
	expect(textNode.nodeValue).not.toMatch(startsWithRegex(TRANSLATION_SYMBOL));
});

test('Triggers callback only after node intersects viewport', async () => {
	const lazyTranslator = new NodesIntersectionObserver();
	const div = document.createElement('div');
	div.textContent = 'Hello world!';
	document.body.appendChild(div);

	const textNode = div.childNodes[0];

	mockBoundingClientRect(document.body, {
		width: 300,
		height: 300,
		x: 0,
		y: 0,
	});

	// element is outside the viewport and does not intersect the container
	mockBoundingClientRect(div, {
		width: 100,
		height: 100,
		x: 0,
		y: 500,
	});

	lazyTranslator.observe(textNode, translator);
	await awaitTranslation();

	// does not translate because the node does not intersect the container
	expect(translator.mock.calls).toEqual([]);
	expect(textNode.nodeValue).not.toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	// change coordinates, the node is now inside the viewport
	mockBoundingClientRect(div, {
		width: 100,
		height: 100,
		x: 0,
		y: 0,
	});

	// simulate a scroll event; the polyfill listens for the "scroll" event on the document
	// The polyfill starts recalculating element positions only after the event
	document.dispatchEvent(new Event('scroll'));
	await awaitTranslation();
	expect(translator.mock.calls).toEqual([[textNode]]);
	expect(textNode.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
});

test('Does not triggers callback for node that does not intersect viewport after scrolling', async () => {
	const lazyTranslator = new NodesIntersectionObserver();
	const div = document.createElement('div');
	div.textContent = 'Hello world!';
	document.body.appendChild(div);

	const textNode = div.childNodes[0];

	mockBoundingClientRect(document.body, {
		width: 300,
		height: 300,
		x: 0,
		y: 0,
	});

	// node is outside the viewport and does not intersect the container
	mockBoundingClientRect(div, {
		width: 100,
		height: 100,
		x: 0,
		y: 400,
	});

	lazyTranslator.observe(textNode, translator);
	await awaitTranslation();

	// does not translate because the element does not intersect the container
	expect(translator.mock.calls).toEqual([]);
	expect(textNode.nodeValue).not.toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	// change coordinates, the node is still outside the viewport
	mockBoundingClientRect(div, {
		width: 100,
		height: 100,
		x: 0,
		y: 330,
	});

	// simulate a scroll event; the polyfill listens for the "scroll" event on the document
	// The polyfill starts recalculating element positions only after the event
	document.dispatchEvent(new Event('scroll'));
	await awaitTranslation();

	// still not translated
	expect(translator.mock.calls).toEqual([]);
	expect(textNode.nodeValue).not.toMatch(startsWithRegex(TRANSLATION_SYMBOL));
});
