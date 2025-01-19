import { vi } from 'vitest';

import { LazyTranslator } from '../LazyTranslator';

require('intersection-observer');

const delay = (time: number) => new Promise((res) => setTimeout(res, time));
const wait = () => delay(120);

const handelNode = vi.fn();

const divElement = document.createElement('div');
const textNode = document.createTextNode('Hello, World!');

divElement.appendChild(textNode);
document.body.appendChild(divElement);

test('handle element when it intersects the viewport', async () => {
	const lazyTraslator = new LazyTranslator(handelNode, {
		lazyTranslate: true,
		isTranslatableNode: (node: Node) => node instanceof Text,
	});

	const isLazyTranslate = lazyTraslator.lazyTranslationHandler(textNode);

	await wait();

	// The mock function was called ones
	expect(handelNode.mock.calls).toHaveLength(1);
	expect(handelNode).toHaveBeenCalledWith(textNode);

	expect(isLazyTranslate).toBe(false);
});

test('not handle element when it does not intersect the viewport', async () => {
	const textNode = document.createTextNode('Hello, World!');

	const lazyTraslator = new LazyTranslator(handelNode, {
		lazyTranslate: true,
		isTranslatableNode: (node: Node) => node instanceof Text,
	});

	const isLazyTranslate = lazyTraslator.lazyTranslationHandler(textNode);

	await wait();

	// The mock function was not called
	expect(handelNode.mock.calls).toHaveLength(1);
	expect(handelNode).toHaveBeenCalledWith(textNode);

	expect(isLazyTranslate).toBe(true);
});

test('not handle node when lazyTranslate is false', async () => {
	const lazyTraslator = new LazyTranslator(handelNode, {
		lazyTranslate: false,
		isTranslatableNode: (node: Node) => node instanceof Text,
	});
	const isLazyTranslate = lazyTraslator.lazyTranslationHandler(textNode);

	await wait();

	expect(isLazyTranslate).toBe(true);
});

test('not handel node when it does not intersect the custom ancestor element', async () => {
	const divElement = document.createElement('div');
	const textNode = document.createTextNode('Hello, World!');

	document.body.appendChild(textNode);
	document.body.appendChild(divElement);

	const lazyTraslator = new LazyTranslator(
		handelNode,
		{
			lazyTranslate: false,
			isTranslatableNode: (node: Node) => node instanceof Text,
		},
		{ root: divElement },
	);
	const isLazyTranslate = lazyTraslator.lazyTranslationHandler(textNode);

	await wait();

	expect(isLazyTranslate).toBe(true);
});
