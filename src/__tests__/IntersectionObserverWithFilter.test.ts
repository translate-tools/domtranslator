import { IntersectionObserverWithFilter } from '../IntersectionObserverWithFilter';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL } from './utils';

require('intersection-observer');

const translator = vi.fn().mockImplementation(async (node: Node) => {
	node.textContent += TRANSLATION_SYMBOL;
});

const isTranslatableNode = () => true;

// jsdom does not actually modify element coordinates
// Create a mock that sets the real values for the coordinates
// DOMRect interface requires the toJSON property, this is not necessary for our tests, so use Omit utility type
const mockBoundingClientRect = (element: HTMLElement, rect: Omit<DOMRect, 'toJSON'>) => {
	Object.defineProperty(element, 'getBoundingClientRect', {
		configurable: true,
		value: () => ({
			...rect,
		}),
	});
};

beforeEach(() => {
	mockBoundingClientRect(document.body, {
		top: 0,
		left: 0,
		bottom: 0,
		right: 0,
		width: 0,
		height: 0,
		x: 0,
		y: 0,
	});
	document.body.innerHTML = '';
	vi.clearAllMocks();
});

test('Call onIntersected for node from viewport', async () => {
	const div = document.createElement('div');
	div.innerHTML = 'Hello, World!';
	document.body.appendChild(div);

	const lazyTranslator = new IntersectionObserverWithFilter({
		filter: isTranslatableNode,
		onIntersected: translator,
	});

	lazyTranslator.attach(div);
	await awaitTranslation();

	// The mock function was called once
	expect(translator.mock.calls).toEqual([[div.childNodes[0]]]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Call onIntersected for a node only when it becomes intersectable', async () => {
	const lazyTranslator = new IntersectionObserverWithFilter({
		filter: isTranslatableNode,
		onIntersected: translator,
	});

	// node not attach to DOM, it not intersectable, not translate it
	const div = document.createElement('div');
	div.innerHTML = 'Hello, world';

	lazyTranslator.attach(div);
	await awaitTranslation();

	expect(translator.mock.calls).toEqual([]);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

	// Attach to the DOM, but elements with display = 'none' is not be intersectable, and not translate
	// node with the visible='hidden' property is considered intersectable, so use the display=none property instead
	document.body.appendChild(div);
	div.style.display = 'none';
	await awaitTranslation();

	expect(translator.mock.calls).toEqual([]);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

	// the node becomes visible and is translated
	div.style.display = 'block';
	await awaitTranslation();

	expect(translator.mock.calls).toEqual([[div.childNodes[0]]]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Not call onIntersected after node is detached', async () => {
	const lazyTranslator = new IntersectionObserverWithFilter({
		filter: isTranslatableNode,
		onIntersected: translator,
	});

	// create node with display=none, it not intersectible
	const div = document.createElement('div');
	div.innerHTML = 'Hello world!';
	div.style.display = 'none';
	document.body.appendChild(div);

	lazyTranslator.attach(div);
	await awaitTranslation();

	// not translate because node not visible
	expect(translator.mock.calls).toEqual([]);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

	// node is detached
	lazyTranslator.detach(div);
	// becomes visible and intersectable, but is still not translated after detach
	div.style.display = 'block';

	expect(translator.mock.calls).toEqual([]);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Call onIntersected only after node intersect viewport', async () => {
	const lazyTranslator = new IntersectionObserverWithFilter({
		filter: isTranslatableNode,
		onIntersected: translator,
	});
	const div = document.createElement('div');
	div.innerHTML = 'Hello world!';
	document.body.appendChild(div);

	mockBoundingClientRect(document.body, {
		top: 0,
		left: 0,
		bottom: 300,
		right: 300,
		width: 300,
		height: 300,
		x: 0,
		y: 0,
	});

	// element out of viewport, it not intersect container
	mockBoundingClientRect(div, {
		top: 400,
		left: 0,
		bottom: 500,
		right: 100,
		width: 100,
		height: 100,
		x: 0,
		y: 0,
	});

	lazyTranslator.attach(div);
	await awaitTranslation();

	// don't translate because the node doesn't intersect the container
	expect(translator.mock.calls).toEqual([]);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

	// change coordinates, now node in viewport
	mockBoundingClientRect(div, {
		top: 0,
		left: 0,
		bottom: 200,
		right: 100,
		width: 100,
		height: 100,
		x: 0,
		y: 0,
	});

	// simulates the scroll event; the polyfill listens for the "scroll" event in the document
	// the scroll event triggers an intersection check
	document.dispatchEvent(new Event('scroll', { bubbles: true }));
	await awaitTranslation();

	expect(translator.mock.calls).toEqual([[div.childNodes[0]]]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Not call a onIntersected for node that not intersect viewport after scrolling', async () => {
	const lazyTranslator = new IntersectionObserverWithFilter({
		filter: isTranslatableNode,
		onIntersected: translator,
	});
	const div = document.createElement('div');
	div.innerHTML = 'Hello world!';
	document.body.appendChild(div);

	mockBoundingClientRect(document.body, {
		top: 0,
		left: 0,
		bottom: 300,
		right: 300,
		width: 300,
		height: 300,
		x: 0,
		y: 0,
	});

	// node out of viewport, it not intersect container
	mockBoundingClientRect(div, {
		top: 400,
		left: 0,
		bottom: 500,
		right: 100,
		width: 100,
		height: 100,
		x: 0,
		y: 0,
	});

	lazyTranslator.attach(div);
	await awaitTranslation();

	// don't translate because the element doesn't intersect the container
	expect(translator.mock.calls).toEqual([]);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

	// change coordinates, node still not in viewport
	mockBoundingClientRect(div, {
		top: 330,
		left: 0,
		bottom: 200,
		right: 100,
		width: 100,
		height: 100,
		x: 0,
		y: 0,
	});

	// simulates the scroll event, and the polyfill listens for the "scroll" event in the document
	// the scroll event triggers an intersection check
	document.dispatchEvent(new Event('scroll', { bubbles: true }));
	await awaitTranslation();

	// still have not translate
	expect(translator.mock.calls).toEqual([]);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
});
