import { vi } from 'vitest';

import { LazyTranslator } from '../LazyTranslator';

require('intersection-observer');

const delay = (time: number) => new Promise((res) => setTimeout(res, time));
const wait = () => delay(120);

const TRANSLATION_SYMBOL = '***TRANSLATED***';
const translator = vi.fn().mockImplementation(async (node: Text) => {
	const data = node.textContent;
	return (node.textContent = TRANSLATION_SYMBOL + data);
});

const isTranslatableNode = (node: Node) => node instanceof Text;

const escapeRegexString = (input: string) => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const containsRegex = (input: string) => new RegExp(`${escapeRegexString(input)}`);

const divElement = document.createElement('div');
const textNode = document.createTextNode('Hello, World!');

divElement.appendChild(textNode);
document.body.appendChild(divElement);

beforeEach(() => {
	vi.clearAllMocks();
});

test('translate element at intersection', async () => {
	const divElement = document.createElement('div');
	const textNode = document.createTextNode('Hello, World!');

	divElement.appendChild(textNode);
	document.body.appendChild(divElement);

	const lazyTraslator = new LazyTranslator(translator, {
		lazyTranslate: true,
		isTranslatableNode,
	});

	const shouldHandleNode = lazyTraslator.lazyTranslationHandler(textNode);

	await wait();

	// The mock function was called ones
	expect(translator.mock.calls).toHaveLength(1);
	expect(translator).toHaveBeenCalledWith(textNode);

	// the node translate lazy
	expect(shouldHandleNode).toBe(false);
	expect(textNode.textContent).toMatchObject(containsRegex(TRANSLATION_SYMBOL));
});

test('not translate nodes that not intersected', async () => {
	const textNode = document.createTextNode('Hello World!');

	const lazyTraslator = new LazyTranslator(translator, {
		lazyTranslate: true,
		isTranslatableNode,
	});

	const shouldHandleNode = lazyTraslator.lazyTranslationHandler(textNode);

	await wait();

	// The mock function was not called
	expect(translator.mock.calls).toHaveLength(0);

	expect(shouldHandleNode).toBe(true);
});

test('not translate nodes with lazyTranslate off', async () => {
	const lazyTraslator = new LazyTranslator(translator, {
		lazyTranslate: false,
		isTranslatableNode,
	});
	const shouldHandleNode = lazyTraslator.lazyTranslationHandler(textNode);

	await wait();

	expect(translator.mock.calls).toHaveLength(0);

	expect(shouldHandleNode).toBe(true);
});

test('not translate node that not intersect the custom ancestor', async () => {
	const divElement = document.createElement('div');
	const textNode = document.createTextNode('Hello, World!');

	document.body.appendChild(textNode);
	document.body.appendChild(divElement);

	const lazyTraslator = new LazyTranslator(
		translator,
		{
			lazyTranslate: false,
			isTranslatableNode,
		},
		{ root: divElement },
	);
	const isLazyTranslate = lazyTraslator.lazyTranslationHandler(textNode);

	await wait();

	expect(isLazyTranslate).toBe(true);
});

test('translate node that intersect the custom ancestor', async () => {
	const divElement = document.createElement('div');
	const textNode = document.createTextNode('Hello, World!');

	divElement.appendChild(textNode);
	document.body.appendChild(divElement);

	const lazyTraslator = new LazyTranslator(
		translator,
		{
			lazyTranslate: true,
			isTranslatableNode,
		},
		{ root: divElement },
	);
	const shouldHandleNode = lazyTraslator.lazyTranslationHandler(textNode);

	await wait();

	// The mock function was called ones
	expect(translator.mock.calls).toHaveLength(1);
	expect(translator).toHaveBeenCalledWith(textNode);

	// the node translate lazy
	expect(shouldHandleNode).toBe(false);
	expect(textNode.textContent).toMatchObject(containsRegex(TRANSLATION_SYMBOL));
});

test('translate node when it becomes visible', async () => {
	const divElement = document.createElement('div');
	const textNode = document.createTextNode('Hello, World!');

	divElement.setAttribute('disabled', 'disabled');

	divElement.appendChild(textNode);
	document.body.appendChild(divElement);

	const lazyTranslator = new LazyTranslator(translator, {
		lazyTranslate: true,
		isTranslatableNode,
	});

	const shouldHandleNode = lazyTranslator.lazyTranslationHandler(divElement);

	await wait();

	// Node not translated because it is disabled

	expect(shouldHandleNode).toBe(false);
	expect(textNode.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

	// Node should be translated
	divElement.removeAttribute('disabled');
	expect(textNode.textContent).toMatchObject(containsRegex(TRANSLATION_SYMBOL));
});
