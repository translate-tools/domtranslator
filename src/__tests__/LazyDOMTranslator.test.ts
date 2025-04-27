import { LazyDOMTranslator } from '../LazyDOMTranslator';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL } from './utils';

require('intersection-observer');

const translator = vi.fn().mockImplementation(async (node: Node) => {
	node.textContent += TRANSLATION_SYMBOL;
});

const isTranslatableNode = (node: Node) => node instanceof Text || node instanceof Attr;

// jsdom does not actually modify element coordinates
// Create a mock that sets the real values for the coordinates
const mockBoundingClientRect = (element: HTMLElement, rect: Partial<DOMRect>) => {
	Object.defineProperty(element, 'getBoundingClientRect', {
		configurable: true,
		value: vi.fn(() => ({
			top: 0,
			left: 0,
			bottom: 0,
			right: 0,
			width: 0,
			height: 0,
			x: 0,
			y: 0,
			...rect,
		})),
	});
};

beforeEach(() => {
	document.body.innerHTML = '';
	vi.clearAllMocks();
});

test('Translate element from viewport', async () => {
	const div = document.createElement('div');
	div.innerHTML = 'Hello, World!';
	document.body.appendChild(div);

	const lazyTranslator = new LazyDOMTranslator({ isTranslatableNode, translator });

	lazyTranslator.attach(div);
	await awaitTranslation();

	// The mock function was called ones
	expect(translator.mock.calls).toHaveLength(1);
	expect(translator).toHaveBeenCalledWith(div.childNodes[0]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Translate one element twice', async () => {
	const div = document.createElement('div');
	div.innerHTML = 'Hello, World!';
	document.body.appendChild(div);

	const lazyTranslator = new LazyDOMTranslator({ isTranslatableNode, translator });
	lazyTranslator.attach(div);
	await awaitTranslation();

	expect(translator.mock.calls).toHaveLength(1);
	expect(translator).toHaveBeenCalledWith(div.childNodes[0]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// update element content
	const updatedText = 'Hello, World 12345!';
	div.innerHTML = updatedText;

	lazyTranslator.attach(div);
	await awaitTranslation();

	// translated text contains translated symbols and updated text
	expect(div.textContent).toMatch(updatedText);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Does not translate elements if they are not attached to the DOM or not visible', async () => {
	const lazyTranslator = new LazyDOMTranslator({ isTranslatableNode, translator });

	// element not attach to DOM
	const div = document.createElement('div');
	div.innerHTML = 'Hello, world';

	lazyTranslator.attach(div);
	await awaitTranslation();

	expect(translator.mock.calls).toHaveLength(0);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

	// Attach to the DOM; elements with display = 'none' should not be intersectable
	document.body.appendChild(div);
	// Hidden: Element with the visible property is considered intersectable, so use the display property instead
	div.style.display = 'none';

	lazyTranslator.attach(div);
	await awaitTranslation();

	expect(translator.mock.calls).toHaveLength(0);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

	// the element becomes visible and is translated
	div.style.display = 'block';
	await awaitTranslation();

	expect(translator.mock.calls).toHaveLength(1);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Not translate element after detach', async () => {
	const lazyTranslator = new LazyDOMTranslator({ isTranslatableNode, translator });

	const div = document.createElement('div');
	div.innerHTML = 'Hello world!';
	div.style.display = 'none';
	document.body.appendChild(div);

	lazyTranslator.attach(div);
	await awaitTranslation();

	// not translate because element not visible
	expect(translator.mock.calls).toHaveLength(0);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

	// element is detached, he becomes visible but still isn't translated after detaching
	lazyTranslator.detach(div);
	div.style.display = 'block';

	expect(translator.mock.calls).toHaveLength(0);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Translate element only after it appears in the viewport', async () => {
	const container = document.createElement('div');
	const div = document.createElement('div');
	div.innerHTML = 'Hello world!';
	container.appendChild(div);
	document.body.appendChild(container);

	mockBoundingClientRect(container, {
		top: 0,
		left: 0,
		bottom: 300,
		right: 300,
		width: 300,
		height: 300,
	});

	// element out of viewport, it not intersect container
	mockBoundingClientRect(div, {
		top: 400,
		left: 0,
		bottom: 500,
		right: 100,
		width: 100,
		height: 100,
	});

	const lazyTranslator = new LazyDOMTranslator({
		isTranslatableNode,
		translator,
		config: { intersectionConfig: { root: container } },
	});

	lazyTranslator.attach(div);
	await awaitTranslation();

	// don't translate because the element doesn't intersect the container
	expect(translator.mock.calls).toHaveLength(0);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

	// change coordinates, now element in viewport
	mockBoundingClientRect(div, {
		top: 100,
		left: 0,
		bottom: 200,
		right: 100,
		width: 100,
		height: 100,
	});

	// simulates the scroll event, and the polyfill listens for the "scroll" event in the document
	// the scroll event triggers an intersection check
	document.dispatchEvent(new Event('scroll', { bubbles: true }));

	await awaitTranslation();
	expect(translator.mock.calls).toHaveLength(1);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Not translate the element if it is still not in the viewport after scrolling', async () => {
	const container = document.createElement('div');
	const div = document.createElement('div');
	div.innerHTML = 'Hello world!';
	container.appendChild(div);
	document.body.appendChild(container);

	mockBoundingClientRect(container, {
		top: 0,
		left: 0,
		bottom: 300,
		right: 300,
		width: 300,
		height: 300,
	});

	// element out of viewport, it not intersect container
	mockBoundingClientRect(div, {
		top: 400,
		left: 0,
		bottom: 500,
		right: 100,
		width: 100,
		height: 100,
	});

	const lazyTranslator = new LazyDOMTranslator({
		isTranslatableNode,
		translator,
		config: { intersectionConfig: { root: container } },
	});

	lazyTranslator.attach(div);
	await awaitTranslation();

	// don't translate because the element doesn't intersect the container
	expect(translator.mock.calls).toHaveLength(0);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

	// change coordinates, element still not in viewport
	mockBoundingClientRect(div, {
		top: 330,
		left: 0,
		bottom: 200,
		right: 100,
		width: 100,
		height: 100,
	});

	// simulates the scroll event, and the polyfill listens for the "scroll" event in the document
	// the scroll event triggers an intersection check
	document.dispatchEvent(new Event('scroll', { bubbles: true }));
	await awaitTranslation();

	// still have not translate
	expect(translator.mock.calls).toHaveLength(0);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
});
