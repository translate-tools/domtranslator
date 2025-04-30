import { DOMTranslator } from '../DOMTranslator';
import { IntersectionObserverWithFilter } from '../IntersectionObserverWithFilter';
import { TranslationDispatcher } from '../TranslationDispatcher';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL, translator } from './utils';

require('intersection-observer');

const intersectionObserverSpy = vi.spyOn(
	IntersectionObserverWithFilter.prototype,
	'attach',
);

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

test('Not use intersectionObserver for not intersectedle node', async () => {
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

	// OPTION node is not intersectible, node can`t translate 'lazy'
	const node = document.createElement('option');
	node.innerHTML = 'Hello, world!';
	document.body.appendChild(node);
	translationDispatcher.translateNode(node);
	await awaitTranslation();

	// lazy translator not called
	expect(intersectionObserverSpy).toBeCalledTimes(0);
	expect(node.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Call IntersectionObserver for deferred translation of intersecting node', async () => {
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
	expect(intersectionObserverSpy.mock.calls).toEqual([[div]]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Not use lazy strategy with falsy lazyTranslate param', async () => {
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
	expect(intersectionObserverSpy.mock.calls).toEqual([]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Translates entire DOM subtree', async () => {
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
