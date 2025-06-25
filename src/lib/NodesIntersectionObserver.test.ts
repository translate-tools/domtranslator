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

const changeElementPosition = (
	node: HTMLElement,
	position?: {
		width?: number;
		height?: number;
		x?: number;
		y?: number;
	},
) => {
	mockBoundingClientRect(node, {
		width: position?.width ?? 100,
		height: position?.height ?? 100,
		x: position?.x ?? 0,
		y: position?.y ?? 0,
	});

	// simulate a scroll event; the polyfill listens for the "scroll" event on the document
	// The polyfill starts recalculating element positions only after the event
	document.dispatchEvent(new Event('scroll'));
};

beforeEach(() => {
	changeElementPosition(document.body);
	document.body.textContent = '';
	vi.clearAllMocks();
});

describe('Trigger callback for nodes in viewport', () => {
	const callback = vi.fn();

	test('triggers for element', async () => {
		const nodesIntersectionObserver = new NodesIntersectionObserver();
		const div = document.createElement('div');

		nodesIntersectionObserver.observe(div, callback);
		await awaitTranslation();

		// mock was called for element
		expect(callback.mock.calls).toEqual([[div]]);
	});
	test('triggers for node', async () => {
		const nodesIntersectionObserver = new NodesIntersectionObserver();
		const node = new Text();

		nodesIntersectionObserver.observe(node, callback);
		await awaitTranslation();

		expect(callback.mock.calls).toEqual([[node]]);
	});
	test('triggers for attribute', async () => {
		const nodesIntersectionObserver = new NodesIntersectionObserver();
		const attr = document.createAttribute('title');

		nodesIntersectionObserver.observe(attr, callback);
		await awaitTranslation();

		expect(callback.mock.calls).toEqual([[attr]]);
	});
});

test('Triggers callback for node in viewport', async () => {
	const textNode = new Text('Hello, World!');
	document.body.appendChild(textNode);

	const nodesIntersectionObserver = new NodesIntersectionObserver();

	nodesIntersectionObserver.observe(textNode, translator);
	await awaitTranslation();

	// The mock function was called once
	expect(translator.mock.calls).toEqual([[textNode]]);
	expect(textNode.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
});

test('Triggers callback for a node only when it becomes intersectable', async () => {
	const nodesIntersectionObserver = new NodesIntersectionObserver();

	// node with display = 'none' is not intersectable
	// node with visibility: 'hidden' is considered intersectable, so use display: 'none' instead
	const div = document.createElement('div');
	div.textContent = 'Hello, world';
	div.style.display = 'none';
	document.body.appendChild(div);

	const textNode = div.childNodes[0];

	nodesIntersectionObserver.observe(textNode, translator);
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
	const nodesIntersectionObserver = new NodesIntersectionObserver();

	// node with display: none is not intersectable
	const div = document.createElement('div');
	div.textContent = 'Hello world!';
	div.style.display = 'none';
	document.body.appendChild(div);

	const textNode = div.childNodes[0];

	nodesIntersectionObserver.observe(textNode, translator);
	await awaitTranslation();

	// does not translate because node is not visible
	expect(translator.mock.calls).toEqual([]);
	expect(textNode.nodeValue).not.toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	// node is detached
	nodesIntersectionObserver.unobserve(textNode);

	// becomes visible and intersectable, but still does not translate after being detached
	div.style.display = 'block';
	await awaitTranslation();
	expect(translator.mock.calls).toEqual([]);
	expect(textNode.nodeValue).not.toMatch(startsWithRegex(TRANSLATION_SYMBOL));
});

test('Triggers callback only after node intersects viewport', async () => {
	const nodesIntersectionObserver = new NodesIntersectionObserver();
	const div = document.createElement('div');
	div.textContent = 'Hello world!';
	document.body.appendChild(div);

	const textNode = div.childNodes[0];

	// coordinates: x=0, y=0
	changeElementPosition(document.body, { width: 300, height: 300 });

	// element is outside the viewport and does not intersect the container
	changeElementPosition(div, { y: 500 });

	nodesIntersectionObserver.observe(textNode, translator);
	await awaitTranslation();

	// does not translate because the node does not intersect the container
	expect(translator.mock.calls).toEqual([]);
	expect(textNode.nodeValue).not.toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	// change coordinates, the node is now inside the viewport (coordinates: x=0, y=0)
	changeElementPosition(div);

	await awaitTranslation();
	expect(translator.mock.calls).toEqual([[textNode]]);
	expect(textNode.nodeValue).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
});

test('Does not triggers callback for node that does not intersect viewport after scrolling', async () => {
	const nodesIntersectionObserver = new NodesIntersectionObserver();
	const div = document.createElement('div');
	div.textContent = 'Hello world!';
	document.body.appendChild(div);

	const textNode = div.childNodes[0];

	// coordinates: x=0, y=0
	changeElementPosition(document.body, { width: 300, height: 300 });

	// node is outside the viewport and does not intersect the container
	changeElementPosition(div, { y: 500 });

	nodesIntersectionObserver.observe(textNode, translator);
	await awaitTranslation();

	// does not translate because the element does not intersect the container
	expect(translator.mock.calls).toEqual([]);
	expect(textNode.nodeValue).not.toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	// change coordinates, the node is still outside the viewport
	changeElementPosition(div, { y: 330 });

	await awaitTranslation();

	// still not translated
	expect(translator.mock.calls).toEqual([]);
	expect(textNode.nodeValue).not.toMatch(startsWithRegex(TRANSLATION_SYMBOL));
});
