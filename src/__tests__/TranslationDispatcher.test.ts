import { DOMNodesTranslator } from '../DOMNodesTranslator';
import { IntersectionObserverWithFilter } from '../IntersectionObserverWithFilter';
import { TranslationDispatcher } from '../TranslationDispatcher';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL, translator } from './utils';

require('intersection-observer');

const lazyTranslatorSpy = vi.spyOn(IntersectionObserverWithFilter.prototype, 'attach');

beforeEach(() => {
	vi.clearAllMocks();
	document.body.innerHTML = '';
});

const isTranslatableNode = () => true;

test('Do not lazily translate not-intersectable node', async () => {
	const domNodesTranslator = new DOMNodesTranslator({
		isTranslatableNode,
		translateCallback: translator,
	});
	const translationDispatcher = new TranslationDispatcher({
		isTranslatableNode,
		domNodesTranslator,
		intersectionObserverWithFilter: new IntersectionObserverWithFilter({
			filter: isTranslatableNode,
			onIntersected: domNodesTranslator.translateNode,
		}),
	});

	// OPTION node is not intersectable, node can`t translate 'lazy'
	const select = document.createElement('select');
	const option = document.createElement('option');
	option.textContent = 'Hello, world!';
	select.appendChild(option);
	document.body.appendChild(select);

	translationDispatcher.translateNode(select);
	await awaitTranslation();

	// lazy translator not called
	expect(lazyTranslatorSpy.mock.calls).toEqual([]);
	// translate immediately
	expect(option.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Lazily translate node', async () => {
	const domNodesTranslator = new DOMNodesTranslator({
		isTranslatableNode,
		translateCallback: translator,
	});
	const translationDispatcher = new TranslationDispatcher({
		isTranslatableNode,
		domNodesTranslator,
		intersectionObserverWithFilter: new IntersectionObserverWithFilter({
			filter: isTranslatableNode,
			onIntersected: domNodesTranslator.translateNode,
		}),
	});

	const div = document.createElement('div');
	div.textContent = 'Hello, world!';
	document.body.appendChild(div);
	translationDispatcher.translateNode(div);
	await awaitTranslation();

	// lazy translator called
	expect(lazyTranslatorSpy.mock.calls).toEqual([[div]]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Translates and restores the original text content of an element and its child elements', async () => {
	const div = document.createElement('div');
	const text = 'Would you like a cup of tea?';
	div.textContent = text;
	const div1 = document.createElement('div');
	const text1 = 'Hi! yes i would';
	div1.textContent = text1;
	div.appendChild(div1);
	document.body.appendChild(div);

	const domNodesTranslator = new DOMNodesTranslator({
		isTranslatableNode,
		translateCallback: translator,
	});
	const translationDispatcher = new TranslationDispatcher({
		isTranslatableNode,
		domNodesTranslator,
	});

	translationDispatcher.translateNode(div);
	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(div1.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	translationDispatcher.restoreNode(div);
	await awaitTranslation();
	expect(div.childNodes[0].textContent).toBe(text);
	expect(div1.childNodes[0].textContent).toBe(text1);
});
