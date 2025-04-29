import { DOMTranslator } from '../DOMTranslator';
import { IntersectionObserverWithFilter } from '../IntersectionObserverWithFilter';
import { TranslationDispatcher } from '../TranslationDispatcher';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL, translator } from './utils';

require('intersection-observer');

const lazyTranslatorSpy = vi.spyOn(IntersectionObserverWithFilter.prototype, 'attach');

beforeEach(() => {
	vi.clearAllMocks();
});

function createClassDependency(
	isTranslatableNode: (node: Node) => boolean,
	translateCallback: (text: string) => Promise<string>,
) {
	const domTranslator = new DOMTranslator({
		isTranslatableNode: isTranslatableNode,
		translateCallback,
	});
	const intersectionObserver = new IntersectionObserverWithFilter({
		filter: isTranslatableNode,
		onIntersected: domTranslator.translateNode,
	});
	return { intersectionObserver, domTranslator };
}

test('Translate node immediately', async () => {
	const config = {
		isTranslatableNode: () => true,
		lazyTranslate: true,
	};
	const { domTranslator, intersectionObserver } = createClassDependency(
		config.isTranslatableNode,
		translator,
	);
	const translationDispatcher = new TranslationDispatcher({
		config,
		domTranslator: domTranslator,
		lazyDOMTranslator: intersectionObserver,
	});

	// Node not to attach the DOM, is can`t translate lazy, but should translated immediately
	const div = document.createElement('div');
	div.innerHTML = 'Hello, world!';
	translationDispatcher.translateNode(div);
	await awaitTranslation();

	// lazy translator not called
	expect(lazyTranslatorSpy).toBeCalledTimes(0);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Translate node lazy', async () => {
	const config = {
		isTranslatableNode: () => true,
		lazyTranslate: true,
	};
	const { domTranslator, intersectionObserver } = createClassDependency(
		config.isTranslatableNode,
		translator,
	);
	const translationDispatcher = new TranslationDispatcher({
		config,
		domTranslator: domTranslator,
		lazyDOMTranslator: intersectionObserver,
	});

	const div = document.createElement('div');
	div.innerHTML = 'Hello, world!';
	document.body.appendChild(div);
	translationDispatcher.translateNode(div);
	await awaitTranslation();

	// lazy translator called
	expect(lazyTranslatorSpy.mock.calls).toEqual([[div]]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Translate immediately with lazyTranslate false', async () => {
	const config = {
		isTranslatableNode: () => true,
		lazyTranslate: false,
	};
	const { domTranslator, intersectionObserver } = createClassDependency(
		config.isTranslatableNode,
		translator,
	);
	const translationDispatcher = new TranslationDispatcher({
		config,
		domTranslator: domTranslator,
		lazyDOMTranslator: intersectionObserver,
	});

	const div = document.createElement('div');
	div.innerHTML = 'Hello, world!';
	document.body.appendChild(div);
	translationDispatcher.translateNode(div);
	await awaitTranslation();

	// lazy translator not called
	expect(lazyTranslatorSpy.mock.calls).toEqual([]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Translate the entire node tree', async () => {
	const config = {
		isTranslatableNode: () => true,
		lazyTranslate: false,
	};
	const { domTranslator, intersectionObserver } = createClassDependency(
		config.isTranslatableNode,
		translator,
	);
	const translationDispatcher = new TranslationDispatcher({
		config,
		domTranslator: domTranslator,
		lazyDOMTranslator: intersectionObserver,
	});

	const div = document.createElement('div');
	div.innerHTML = 'Hello';
	const div1 = document.createElement('div');
	div1.innerHTML = 'Hello world';
	const p = document.createElement('p');
	p.innerHTML = 'I`m a fox';
	div1.appendChild(p);
	div.appendChild(div1);

	translationDispatcher.translateNode(div1);
	await awaitTranslation();

	// all nodes was translated
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(div1.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(p.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});
