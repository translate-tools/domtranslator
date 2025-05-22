import { DOMNodesTranslator } from '../DOMNodesTranslator';
import { TranslationDispatcher } from '../TranslationDispatcher';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL, translator } from './utils';
import { NodesTranslator } from '..';

test('Translating a node does not trigger recursive updateNode calls.', async () => {
	const nodeTranslator = new DOMNodesTranslator(translator);
	const dispatcher = new TranslationDispatcher({
		filter: () => true,
		nodeTranslator: nodeTranslator,
	});
	const nodesTranslator = new NodesTranslator({ dispatcher, nodeTranslator });
	const updateNodeSpy = vi.spyOn(dispatcher, 'updateNode');

	const div = document.createElement('div');
	const text = 'simple short text';
	div.textContent = text;
	document.body.appendChild(div);
	nodesTranslator.observe(div);

	await awaitTranslation();
	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Translation of added nodes does not trigger recursive updateNode calls.', async () => {
	const nodeTranslator = new DOMNodesTranslator(translator);
	const dispatcher = new TranslationDispatcher({
		filter: () => true,
		nodeTranslator: nodeTranslator,
	});
	const nodesTranslator = new NodesTranslator({ dispatcher, nodeTranslator });
	const updateNodeSpy = vi.spyOn(dispatcher, 'updateNode');

	const div = document.createElement('div');
	const text = 'Siple short text';
	div.textContent = text;
	document.body.appendChild(div);
	nodesTranslator.observe(div);

	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// add new element
	const div1 = document.createElement('div');
	const text1 = 'Not a rectangle, but a square';
	div1.textContent = text1;
	div.appendChild(div1);

	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);
	expect(div1.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// add new attribute
	const text2 = 'Short text';
	div.setAttribute('title', text2);

	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Updating an attribute multiple times does not trigger recursive updateNode calls', async () => {
	const nodeTranslator = new DOMNodesTranslator(translator);
	const dispatcher = new TranslationDispatcher({
		filter: () => true,
		nodeTranslator: nodeTranslator,
	});
	const nodesTranslator = new NodesTranslator({ dispatcher, nodeTranslator });
	const updateNodeSpy = vi.spyOn(dispatcher, 'updateNode');

	const div = document.createElement('a');
	const text = 'title text';
	div.setAttribute('title', text);
	document.body.appendChild(div);
	nodesTranslator.observe(div);

	await awaitTranslation();
	expect(updateNodeSpy.mock.calls).toEqual([]);
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// update content, node should be translated
	const text1 = 'new Text';
	div.setAttribute('title', text1);
	await awaitTranslation();

	expect(updateNodeSpy.mock.calls[0][0]).toEqual(div.attributes[0]);
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(div.getAttribute('title')).toMatch(text1);

	// update content again, node should be translated
	const text2 = 'new Text with new information';
	div.setAttribute('title', text2);
	await awaitTranslation();

	expect(updateNodeSpy.mock.calls[1][0]).toEqual(div.attributes[0]);
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(div.getAttribute('title')).toMatch(text2);
});

test('Updating a node with a translated-looking value triggers updateNode calls', async () => {
	const nodeTranslator = new DOMNodesTranslator(translator);
	const dispatcher = new TranslationDispatcher({
		filter: () => true,
		nodeTranslator: nodeTranslator,
	});
	const nodesTranslator = new NodesTranslator({ dispatcher, nodeTranslator });
	const updateNodeSpy = vi.spyOn(dispatcher, 'updateNode');

	const div = document.createElement('a');
	const text = 'title text';
	div.setAttribute('title', text);
	document.body.appendChild(div);
	nodesTranslator.observe(div);

	await awaitTranslation();
	// updateNode should not be called
	expect(updateNodeSpy.mock.calls).toEqual([]);
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));

	const text1 = TRANSLATION_SYMBOL + 'title text';
	div.setAttribute('title', text1);

	await awaitTranslation();
	expect(updateNodeSpy.mock.calls[0][0]).toEqual(div.attributes[0]);
	expect(div.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));
	expect(div.getAttribute('title')).toMatch(text1);

	// restored node has the last set text
	nodesTranslator.unobserve(div);
	expect(div.getAttribute('title')).toBe(text1);
});
