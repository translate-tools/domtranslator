import { DOMNodesTranslator } from '../DOMNodesTranslator';
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

const isTranslatableNode = () => true;

test('Not call intersectionObserver for not intersectedle node', async () => {
	const domTranslator = new DOMNodesTranslator({
		isTranslatableNode: isTranslatableNode,
		translateCallback: translator,
	});
	const translationDispatcher = new TranslationDispatcher({
		config: { isTranslatableNode },
		domTranslator: domTranslator,

		lazyDOMTranslator: new IntersectionObserverWithFilter({
			filter: isTranslatableNode,
			onIntersected: domTranslator.translateNode,
		}),
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
	const domTranslator = new DOMNodesTranslator({
		isTranslatableNode: isTranslatableNode,
		translateCallback: translator,
	});
	const translationDispatcher = new TranslationDispatcher({
		config: { isTranslatableNode },
		domTranslator: domTranslator,

		lazyDOMTranslator: new IntersectionObserverWithFilter({
			filter: isTranslatableNode,
			onIntersected: domTranslator.translateNode,
		}),
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
	const domTranslator = new DOMNodesTranslator({
		isTranslatableNode: isTranslatableNode,
		translateCallback: translator,
	});
	const translationDispatcher = new TranslationDispatcher({
		config: { isTranslatableNode },
		domTranslator: domTranslator,
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
