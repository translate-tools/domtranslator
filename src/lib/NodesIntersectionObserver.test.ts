import { Mock } from 'vitest';

import { mockBoundingClientRect } from '../__tests__/utils';
import { NodesIntersectionObserver } from './NodesIntersectionObserver';

require('intersection-observer');

const resetElementPosition = (
	node: HTMLElement,
	{
		width = 100,
		height = 100,
		x = 0,
		y = 0,
	}: {
		width?: number;
		height?: number;
		x?: number;
		y?: number;
	} = {},
) => {
	mockBoundingClientRect(node, {
		width,
		height,
		x,
		y,
	});
	// simulate a scroll event; the polyfill listens for the "scroll" event on the document
	// The polyfill starts recalculating element positions only after the event
	document.dispatchEvent(new Event('scroll'));
};

const waitMockCall = (callback: Mock, timeout = 200) => {
	const initialCallCount = callback.mock.calls.length;

	return new Promise<void>((resolve, reject) => {
		const start = Date.now();

		const interval = setInterval(() => {
			if (callback.mock.calls.length > initialCallCount) {
				clearInterval(interval);
				resolve();
			}

			if (Date.now() - start > timeout) {
				clearInterval(interval);
				reject(new Error('Timeout expired'));
			}
		}, 10);
	});
};

const callback = vi.fn();

beforeEach(() => {
	resetElementPosition(document.body, { width: 1280, height: 960 });
	document.body.textContent = '';
	vi.clearAllMocks();
});

describe('Trigger callback for nodes in viewport', () => {
	test('triggers for element', async () => {
		const intersectionObserver = new NodesIntersectionObserver();
		const div = document.createElement('div');

		intersectionObserver.observe(div, callback);
		await expect(waitMockCall(callback)).rejects.toThrow();

		expect(callback.mock.calls).toEqual([[div]]);
	});
	test('triggers for node', async () => {
		const intersectionObserver = new NodesIntersectionObserver();
		const textNode = new Text('Hello, World!');

		intersectionObserver.observe(textNode, callback);
		await expect(waitMockCall(callback)).rejects.toThrow();

		expect(callback.mock.calls).toEqual([[textNode]]);
	});
	test('triggers for attribute', async () => {
		const intersectionObserver = new NodesIntersectionObserver();
		const attr = document.createAttribute('title');

		intersectionObserver.observe(attr, callback);
		await expect(waitMockCall(callback)).rejects.toThrow();

		expect(callback.mock.calls).toEqual([[attr]]);
	});
});

test('Triggers callback for a node only when it becomes intersectable', async () => {
	const intersectionObserver = new NodesIntersectionObserver();

	// node with display = 'none' is not intersectable
	// node with visibility: 'hidden' is considered intersectable, so use display: 'none' instead
	const div = document.createElement('div');
	div.textContent = 'Hello, world';
	div.style.display = 'none';
	document.body.appendChild(div);

	intersectionObserver.observe(div, callback);
	await expect(waitMockCall(callback)).rejects.toThrow();

	// does not call the callback because the node is not visible
	expect(callback.mock.calls).toEqual([]);

	// the node becomes visible and the callback is called
	div.style.display = 'block';
	await waitMockCall(callback);

	expect(callback.mock.calls).toEqual([[div]]);
});

test('Does not trigger callback after node is detached', async () => {
	const intersectionObserver = new NodesIntersectionObserver();

	// node with display: none is not intersectable
	const div = document.createElement('div');
	div.textContent = 'Hello world!';
	div.style.display = 'none';
	document.body.appendChild(div);

	intersectionObserver.observe(div, callback);
	await expect(waitMockCall(callback)).rejects.toThrow();

	// does not call the callback because the node is not visible
	expect(callback.mock.calls).toEqual([]);

	// node is detached
	intersectionObserver.unobserve(div);

	// becomes visible and intersectable, but still doesn't call the callback after being detached
	div.style.display = 'block';
	await expect(waitMockCall(callback)).rejects.toThrow();

	expect(callback.mock.calls).toEqual([]);
});

test('Triggers callback only after node intersects viewport', async () => {
	const intersectionObserver = new NodesIntersectionObserver();

	const div = document.createElement('div');
	div.textContent = 'Hello world!';
	document.body.appendChild(div);

	// element is outside the viewport and does not intersect the container
	resetElementPosition(div, { y: -1000 });

	intersectionObserver.observe(div, callback);
	await expect(waitMockCall(callback)).rejects.toThrow();

	// the callback is not called because the node does not intersect the container
	expect(callback.mock.calls).toEqual([]);

	// change coordinates, the node is now inside the viewport
	resetElementPosition(div);

	await waitMockCall(callback);

	expect(callback.mock.calls).toEqual([[div]]);
});

test('Does not triggers callback for node that does not intersect viewport after scrolling', async () => {
	const intersectionObserver = new NodesIntersectionObserver();

	const div = document.createElement('div');
	div.textContent = 'Hello world!';
	document.body.appendChild(div);

	// node is outside the viewport and does not intersect the container
	resetElementPosition(div, { y: -1000 });

	intersectionObserver.observe(div, callback);
	await expect(waitMockCall(callback)).rejects.toThrow();

	// the callback is not called because the element does not intersect the container
	expect(callback.mock.calls).toEqual([]);

	// change coordinates, the node is still outside the viewport
	resetElementPosition(div, { y: -1500 });

	await expect(waitMockCall(callback)).rejects.toThrow();

	// still not called
	expect(callback.mock.calls).toEqual([]);
});
