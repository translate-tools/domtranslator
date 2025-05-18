import { NodesIntersectionObserver } from '../NodesIntersectionObserver';
import {
	awaitTranslation,
	containsRegex,
	mockBoundingClientRect,
	TRANSLATION_SYMBOL,
} from './utils';

require('intersection-observer');

const translator = vi.fn().mockImplementation(async (node: Node) => {
	node.textContent += TRANSLATION_SYMBOL;
});

beforeEach(() => {
	mockBoundingClientRect(document.body, {
		width: 0,
		height: 0,
		x: 0,
		y: 0,
	});
	document.body.textContent = '';
	vi.clearAllMocks();
});

test('Calls callback for node from viewport', async () => {
	const div = document.createElement('div');
	div.textContent = 'Hello, World!';
	document.body.appendChild(div);

	const lazyTranslator = new NodesIntersectionObserver();

	lazyTranslator.observe(div.childNodes[0], translator);
	await awaitTranslation();

	// The mock function was called once
	expect(translator.mock.calls).toEqual([[div.childNodes[0]]]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Calls callback for a node only when it becomes intersectable', async () => {
	const lazyTranslator = new NodesIntersectionObserver();

	// node with display = 'none' is not intersectable
	// node with the visible='hidden' property is considered intersectable, so use the display=none property instead
	const div = document.createElement('div');
	div.textContent = 'Hello, world';
	div.style.display = 'none';
	document.body.appendChild(div);

	lazyTranslator.observe(div.childNodes[0], translator);
	await awaitTranslation();

	expect(translator.mock.calls).toEqual([]);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

	// the node becomes visible and is translated
	div.style.display = 'block';
	await awaitTranslation();

	expect(translator.mock.calls).toEqual([[div.childNodes[0]]]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Not calls callback after node is detached', async () => {
	const lazyTranslator = new NodesIntersectionObserver();

	// create node with display=none, it not intersectible
	const div = document.createElement('div');
	div.textContent = 'Hello world!';
	div.style.display = 'none';
	document.body.appendChild(div);

	lazyTranslator.observe(div.childNodes[0], translator);
	await awaitTranslation();

	// not translate because node not visible
	expect(translator.mock.calls).toEqual([]);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

	// node is detached
	lazyTranslator.unobserve(div.childNodes[0]);
	// becomes visible and intersectable, but is still not translated after detach
	div.style.display = 'block';
	await awaitTranslation();

	expect(translator.mock.calls).toEqual([]);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Calls callback only after node intersect viewport', async () => {
	const lazyTranslator = new NodesIntersectionObserver();
	const div = document.createElement('div');
	div.textContent = 'Hello world!';
	document.body.appendChild(div);

	mockBoundingClientRect(document.body, {
		width: 300,
		height: 300,
		x: 0,
		y: 0,
	});

	// element out of viewport, it not intersect container
	mockBoundingClientRect(div, {
		width: 100,
		height: 100,
		x: 0,
		y: 500,
	});

	lazyTranslator.observe(div.childNodes[0], translator);
	await awaitTranslation();

	// don't translate because the node doesn't intersect the container
	expect(translator.mock.calls).toEqual([]);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

	// change coordinates, now node in viewport
	mockBoundingClientRect(div, {
		width: 100,
		height: 100,
		x: 0,
		y: 0,
	});

	// simulates the scroll event; polyfill listens for the "scroll" event on the document
	// The polyfill will start recalculating the element position to find intersections only after the event
	document.dispatchEvent(new Event('scroll'));
	await awaitTranslation();

	expect(translator.mock.calls).toEqual([[div.childNodes[0]]]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Not calls a callback for node that not intersect viewport after scrolling', async () => {
	const lazyTranslator = new NodesIntersectionObserver();
	const div = document.createElement('div');
	div.textContent = 'Hello world!';
	document.body.appendChild(div);

	mockBoundingClientRect(document.body, {
		width: 300,
		height: 300,
		x: 0,
		y: 0,
	});

	// node out of viewport, it not intersect container
	mockBoundingClientRect(div, {
		width: 100,
		height: 100,
		x: 0,
		y: 400,
	});

	lazyTranslator.observe(div.childNodes[0], translator);
	await awaitTranslation();

	// don't translate because the element doesn't intersect the container
	expect(translator.mock.calls).toEqual([]);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

	// change coordinates, node still not in viewport
	mockBoundingClientRect(div, {
		width: 100,
		height: 100,
		x: 0,
		y: 330,
	});

	// simulates the scroll event; polyfill listens for the "scroll" event on the document
	// The polyfill will start recalculating the element position to find intersections only after the event
	document.dispatchEvent(new Event('scroll'));
	await awaitTranslation();

	// still have not translate
	expect(translator.mock.calls).toEqual([]);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
});
