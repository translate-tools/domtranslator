import { DOMNodesTranslator } from '../DOMNodesTranslator';
import { TranslationDispatcher } from '../TranslationDispatcher';
import {
	awaitTranslation,
	delay,
	startsWithRegex,
	TRANSLATION_SYMBOL,
	translator,
} from './utils';
import { NodesTranslator, TranslatorInterface } from '..';

beforeEach(() => {
	document.body.innerHTML = '';
	vi.clearAllMocks();
});

function buildTranslationServices(translator: TranslatorInterface) {
	const domNodeTranslator = new DOMNodesTranslator(translator);
	const dispatcher = new TranslationDispatcher({
		filter: () => true,
		nodesTranslator: domNodeTranslator,
	});
	const nodesTranslator = new NodesTranslator({
		dispatcher,
		nodesTranslator: domNodeTranslator,
	});

	const updateNodeSpy = vi.spyOn(dispatcher, 'updateNode');

	return { nodesTranslator, updateNodeSpy };
}

test('Translation of nodes does not trigger recursive updateNode calls', async () => {
	const { nodesTranslator, updateNodeSpy } = buildTranslationServices(translator);

	const div1 = document.createElement('div');
	div1.textContent = 'Simple text';
	document.body.appendChild(div1);

	nodesTranslator.observe(div1);
	await awaitTranslation();
	expect(div1.textContent).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);

	// add new element
	const div2 = document.createElement('div');
	div2.textContent = 'New text';
	div1.appendChild(div2);

	await awaitTranslation();
	expect(div2.textContent).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);

	// add new attribute
	div1.setAttribute('title', 'Short text');

	await awaitTranslation();
	expect(div1.getAttribute('title')).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);
});

test('Updating a node does not trigger recursive updateNode calls', async () => {
	const { nodesTranslator, updateNodeSpy } = buildTranslationServices(translator);

	const div = document.createElement('div');
	div.setAttribute('title', 'title text');
	document.body.appendChild(div);

	nodesTranslator.observe(div);
	await awaitTranslation();
	expect(div.getAttribute('title')).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);

	// update content, node should be translated without triggering recursion
	const text = 'new text';
	div.setAttribute('title', text);
	await awaitTranslation();

	// second arg is a callback, not relevant for this test
	expect(updateNodeSpy.mock.calls).toEqual([[div.attributes[0], expect.any(Function)]]);
	expect(div.getAttribute('title')).toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	await awaitTranslation();
	expect(updateNodeSpy).toBeCalledTimes(1);
});

test('Updating a node with a translated-looking value not trigger recursive updateNode calls', async () => {
	const { nodesTranslator, updateNodeSpy } = buildTranslationServices(translator);

	const div = document.createElement('div');
	const text1 = 'title text';
	div.setAttribute('title', text1);
	document.body.appendChild(div);

	nodesTranslator.observe(div);
	await awaitTranslation();
	expect(div.getAttribute('title')).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);

	// update content, node should be translated without triggering recursion
	const text2 = TRANSLATION_SYMBOL + text1;
	div.setAttribute('title', text2);
	await awaitTranslation();

	// second arg is a callback, not relevant for this test
	expect(updateNodeSpy.mock.calls).toEqual([[div.attributes[0], expect.any(Function)]]);
	expect(div.getAttribute('title')).toBe(TRANSLATION_SYMBOL + text2);

	await awaitTranslation();
	expect(updateNodeSpy).toHaveBeenCalledTimes(1);

	// restored node has the latest text
	nodesTranslator.unobserve(div);
	expect(div.getAttribute('title')).toBe(text2);
});

test('Only the latest translation will be applied to the node', async () => {
	// first translation call resolves after 300 ms, second — after 100 ms
	const translatorWithDelay = vi
		.fn()
		.mockImplementationOnce(
			(text: string) =>
				new Promise((res) => setTimeout(() => res(translator(text)), 300)),
		)
		.mockImplementationOnce(
			(text: string) =>
				new Promise((res) => setTimeout(() => res(translator(text)), 100)),
		);
	const { nodesTranslator } = buildTranslationServices(translatorWithDelay);

	const div = document.createElement('div');
	const text1 = 'title text';
	div.setAttribute('title', text1);
	document.body.appendChild(div);

	// first slow translation (300ms)
	nodesTranslator.observe(div);

	// waiting (less then 300 ms); the translation is not completed yet, node not changed
	await delay(100);
	await awaitTranslation();
	expect(translatorWithDelay).toHaveBeenCalledTimes(1);
	expect(div.getAttribute('title')).toBe(text1);

	// second fast translation (100ms)
	const text2 = 'new title text';
	div.setAttribute('title', text2);

	// waiting (more then 100 ms); the translation is complete and node was changed
	await delay(100);
	await awaitTranslation();
	expect(translatorWithDelay).toHaveBeenCalledTimes(2);
	expect(div.getAttribute('title')).toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	// wait for first translation to finish; translation not applied, node remains unchanged
	await delay(200);
	await awaitTranslation();
	expect(div.getAttribute('title')).toMatch(text2);

	// reset
	nodesTranslator.unobserve(div);
	expect(div.getAttribute('title')).toBe(text2);
});
