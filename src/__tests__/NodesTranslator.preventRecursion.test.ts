import { DOMNodesTranslator } from '../DOMNodesTranslator';
import { TranslationDispatcher } from '../TranslationDispatcher';
import {
	awaitTranslation,
	containsRegex,
	delay,
	TRANSLATION_SYMBOL,
	translator,
	translatorMockWithDelays,
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
	return { dispatcher, nodesTranslator };
}

test('Translating a node does not trigger recursive updateNode calls', async () => {
	const { nodesTranslator, dispatcher } = buildTranslationServices(translator);
	const updateNodeSpy = vi.spyOn(dispatcher, 'updateNode');

	const div = document.createElement('div');
	div.textContent = 'simple short text';
	document.body.appendChild(div);
	nodesTranslator.observe(div);

	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// wait the update call trigger
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);
});

test('Translation of added nodes does not trigger recursive updateNode calls', async () => {
	const { nodesTranslator, dispatcher } = buildTranslationServices(translator);
	const updateNodeSpy = vi.spyOn(dispatcher, 'updateNode');

	const div = document.createElement('div');
	div.textContent = 'Siple short text';
	document.body.appendChild(div);
	nodesTranslator.observe(div);

	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);

	// add new element
	const div1 = document.createElement('div');
	div1.textContent = 'New simple text';
	div.appendChild(div1);

	await awaitTranslation();
	expect(div1.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);

	// add new attribute
	div.setAttribute('title', 'Short simple text');

	await awaitTranslation();
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);
});

test('Updating a node does not trigger recursive updateNode calls', async () => {
	const { nodesTranslator, dispatcher } = buildTranslationServices(translator);
	const updateNodeSpy = vi.spyOn(dispatcher, 'updateNode');

	const div = document.createElement('a');
	div.setAttribute('title', 'title text');
	document.body.appendChild(div);
	nodesTranslator.observe(div);

	await awaitTranslation();
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);

	// update content, node should be translated without triggering recursion
	const text = 'new Text';
	div.setAttribute('title', text);
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls[0][0]).toEqual(div.attributes[0]);
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(div.getAttribute('title')).toMatch(text);

	// no recursion
	await awaitTranslation();
	expect(updateNodeSpy).toBeCalledTimes(1);

	nodesTranslator.unobserve(div);
	expect(div.getAttribute('title')).toBe(text);
});

test('Updating a node with a translated-looking value not trigger recursive updateNode calls', async () => {
	const { nodesTranslator, dispatcher } = buildTranslationServices(translator);
	const updateNodeSpy = vi.spyOn(dispatcher, 'updateNode');

	const div = document.createElement('a');
	const text1 = 'title text';
	div.setAttribute('title', text1);
	document.body.appendChild(div);

	nodesTranslator.observe(div);
	await awaitTranslation();
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);

	// update content, node should be translated without triggering recursion
	const text2 = TRANSLATION_SYMBOL + text1;
	div.setAttribute('title', text2);
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls[0][0]).toEqual(div.attributes[0]);
	expect(div.getAttribute('title')).toBe(TRANSLATION_SYMBOL + text2);

	// no recursion
	await awaitTranslation();
	expect(updateNodeSpy).toHaveBeenCalledTimes(1);

	// restored node has the latest text
	nodesTranslator.unobserve(div);
	expect(div.getAttribute('title')).toBe(text2);
});

test('Only the latest translation will be applied to the node', async () => {
	const { nodesTranslator } = buildTranslationServices(translatorMockWithDelays);

	const div = document.createElement('a');
	const text1 = 'title text';
	div.setAttribute('title', text1);
	document.body.appendChild(div);
	nodesTranslator.observe(div);

	// first translation call resolves after 300 ms, second — after 100 ms

	// Start the first (slow) translation. Do not wait for it to complete yet
	// Ensure that the callback has not been called and content is unchanged
	await awaitTranslation();
	expect(translatorMockWithDelays).toHaveBeenCalledTimes(1);
	expect(div.getAttribute('title')).toBe(text1);

	// Start the second (fast) translation and wait for it to complete
	// Ensure the callback is called and the content is updated
	const text2 = 'you must translate me';
	div.setAttribute('title', text2);
	await delay(100);
	await awaitTranslation();

	expect(translatorMockWithDelays).toHaveBeenCalledTimes(2);
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(div.getAttribute('title')).toMatch(text2);

	// Wait for the first (slow) translation to complete, ensure the callback is still called only once.
	await delay(200);
	await awaitTranslation();
	expect(div.getAttribute('title')).toMatch(text2);

	// reset
	nodesTranslator.unobserve(div);
	expect(div.getAttribute('title')).toBe(text2);
});
