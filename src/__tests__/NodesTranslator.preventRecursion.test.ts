import { DOMNodesTranslator } from '../DOMNodesTranslator';
import { TranslationDispatcher } from '../TranslationDispatcher';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL, translator } from './utils';
import { NodesTranslator, TranslatorInterface } from '..';

beforeEach(() => {
	document.body.innerHTML = '';
});

function buildTranslationServices(translator: TranslatorInterface) {
	const nodeTranslator = new DOMNodesTranslator(translator);
	const dispatcher = new TranslationDispatcher({
		filter: () => true,
		nodeTranslator: nodeTranslator,
	});
	return { dispatcher, nodeTranslator };
}

test('Translating a node does not trigger recursive updateNode calls', async () => {
	const { dispatcher, nodeTranslator } = buildTranslationServices(translator);
	const nodesTranslator = new NodesTranslator({ dispatcher, nodeTranslator });
	const updateNodeSpy = vi.spyOn(dispatcher, 'updateNode');

	const div = document.createElement('div');
	const text = 'simple short text';
	div.textContent = text;
	document.body.appendChild(div);
	nodesTranslator.observe(div);

	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);
});

test('Translation of added nodes does not trigger recursive updateNode calls', async () => {
	const { dispatcher, nodeTranslator } = buildTranslationServices(translator);
	const nodesTranslator = new NodesTranslator({ dispatcher, nodeTranslator });
	const updateNodeSpy = vi.spyOn(dispatcher, 'updateNode');

	const div = document.createElement('div');
	const text = 'Siple short text';
	div.textContent = text;
	document.body.appendChild(div);
	nodesTranslator.observe(div);

	await awaitTranslation();
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);

	// add new element
	const div1 = document.createElement('div');
	const text1 = 'Not a rectangle, but a square';
	div1.textContent = text1;
	div.appendChild(div1);

	await awaitTranslation();
	expect(div1.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);

	// add new attribute
	const text2 = 'Short text';
	div.setAttribute('title', text2);

	await awaitTranslation();
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);
});

test('Updating a node does not trigger recursive updateNode calls', async () => {
	const { dispatcher, nodeTranslator } = buildTranslationServices(translator);
	const nodesTranslator = new NodesTranslator({ dispatcher, nodeTranslator });
	const updateNodeSpy = vi.spyOn(dispatcher, 'updateNode');

	const div = document.createElement('a');
	const text = 'title text';
	div.setAttribute('title', text);
	document.body.appendChild(div);
	nodesTranslator.observe(div);

	await awaitTranslation();
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);

	// update content, node should be translated without triggering recursion
	const text1 = 'new Text';
	div.setAttribute('title', text1);
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls[0][0]).toEqual(div.attributes[0]);
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(div.getAttribute('title')).toMatch(text1);

	// no recursion
	await awaitTranslation();
	expect(updateNodeSpy).toBeCalledTimes(1);

	nodesTranslator.unobserve(div);
	expect(div.getAttribute('title')).toBe(text1);
});

test('Updating a node with a translated-looking value not trigger recursive updateNode calls', async () => {
	const { dispatcher, nodeTranslator } = buildTranslationServices(translator);
	const nodesTranslator = new NodesTranslator({ dispatcher, nodeTranslator });
	const updateNodeSpy = vi.spyOn(dispatcher, 'updateNode');

	const div = document.createElement('a');
	const text = 'title text';
	div.setAttribute('title', text);
	document.body.appendChild(div);

	nodesTranslator.observe(div);
	await awaitTranslation();
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);

	// update content, node should be translated without triggering recursion
	const text1 = TRANSLATION_SYMBOL + text;
	div.setAttribute('title', text1);
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls[0][0]).toEqual(div.attributes[0]);
	expect(div.getAttribute('title')).toBe(TRANSLATION_SYMBOL + text1);

	// no recursion
	await awaitTranslation();
	expect(updateNodeSpy).toHaveBeenCalledTimes(1);

	// restored node has the latest text
	nodesTranslator.unobserve(div);
	expect(div.getAttribute('title')).toBe(text1);
});

test('Only the latest translation will be applied to the node', async () => {
	// first call resolves after 300 ms, second call — after 100 ms
	const translator = vi
		.fn()
		.mockImplementationOnce(
			(text: string) =>
				new Promise((resolve) =>
					setTimeout(() => resolve((text += TRANSLATION_SYMBOL)), 300),
				),
		)
		.mockImplementationOnce(
			(text: string) =>
				new Promise((resolve) =>
					setTimeout(() => resolve((text += TRANSLATION_SYMBOL)), 100),
				),
		);
	const { dispatcher, nodeTranslator } = buildTranslationServices(translator);
	const nodesTranslator = new NodesTranslator({ dispatcher, nodeTranslator });
	const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	const div = document.createElement('a');
	const text = 'title text';
	div.setAttribute('title', text);
	document.body.appendChild(div);
	nodesTranslator.observe(div);

	// this translation completes within 300 ms, do not wait for completion
	await delay(100);
	expect(translator).toHaveBeenCalledTimes(1);
	expect(div.getAttribute('title')).toBe(text);

	const text1 = 'you must translate me';
	div.setAttribute('title', text1);

	// this translation completes in 100 ms, wait for it
	await delay(110);
	expect(translator).toHaveBeenCalledTimes(2);
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(div.getAttribute('title')).toMatch(text1);

	// wait for the first translation to finish, it does not modify the node
	await delay(200);
	expect(div.getAttribute('title')).toMatch(text1);

	// reset
	nodesTranslator.unobserve(div);
	expect(div.getAttribute('title')).toBe(text1);
});
