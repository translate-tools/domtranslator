import {
	awaitTranslation,
	mockBoundingClientRect,
	startsWithRegex,
	TRANSLATION_SYMBOL,
	translator,
} from './__tests__/utils';
import { DOMTranslator } from './DOMTranslator';
import { IntersectionScheduler } from './IntersectionScheduler';
import { NodesTranslator } from './NodesTranslator';

require('intersection-observer');

beforeEach(() => {
	document.body.innerHTML = '';
	mockBoundingClientRect(document.body, { width: 1280, height: 960, x: 0, y: 0 });
	vi.clearAllMocks();
});

const isTranslatableNode = () => true;

describe('Translate node in lazy-translation mode', () => {
	test('immediately translates non-intersecting node', async () => {
		const domTranslator = new DOMTranslator(new NodesTranslator(translator), {
			filter: isTranslatableNode,
			scheduler: new IntersectionScheduler(),
		});

		// OPTION node is not intersectable; it cannot be translated later
		const select = document.createElement('select');
		const option = document.createElement('option');
		option.textContent = 'Hello, world!';
		select.appendChild(option);
		document.body.appendChild(select);

		// element is outside the viewport
		// IntersectionObserver should not invoke the callback until the node appears in the viewport
		mockBoundingClientRect(option, { width: 100, height: 100, x: 0, y: -1000 });

		// the element is translated regardless of viewport intersection
		domTranslator.translate(select);
		await awaitTranslation();
		expect(option.textContent).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	});

	test('immediately translates node not attached to document.body', async () => {
		const domTranslator = new DOMTranslator(new NodesTranslator(translator), {
			filter: isTranslatableNode,
			scheduler: new IntersectionScheduler(),
		});

		// div not attached to body, it cannot be translated later
		const div = document.createElement('div');
		div.textContent = 'hello';

		// element is outside the viewport
		mockBoundingClientRect(div, { width: 100, height: 100, x: 0, y: -1000 });

		// the element is translated regardless of viewport intersection
		domTranslator.translate(div);
		await awaitTranslation();
		expect(div.textContent).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	});

	test('immediately translates node inside shadow DOM', async () => {
		const domTranslator = new DOMTranslator(new NodesTranslator(translator), {
			filter: isTranslatableNode,
			scheduler: new IntersectionScheduler(),
		});

		// The element nested inside a shadow element is not directly attached to document.body
		// so it is not intersectable and cannot be translated later
		const host = document.createElement('div');
		const shadowRoot = host.attachShadow({ mode: 'open' });
		const div = document.createElement('div');
		const text = 'Hello world';
		div.textContent = text;

		shadowRoot.appendChild(div);
		document.body.appendChild(host);

		// element is outside the viewport
		mockBoundingClientRect(div, { width: 100, height: 100, x: 0, y: -1000 });

		// the element is translated regardless of viewport intersection
		domTranslator.translate(div);
		await awaitTranslation();
		expect(div.textContent).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	});
});

test('Translates and restores the element and its child elements', async () => {
	const domTranslator = new DOMTranslator(new NodesTranslator(translator), {
		filter: isTranslatableNode,
		scheduler: new IntersectionScheduler(),
	});

	const div1 = document.createElement('div');
	const text1 = 'Would you like a cup of tea?';
	div1.textContent = text1;
	const div2 = document.createElement('div');
	const text2 = 'Hi! yes i would';
	div2.textContent = text2;
	div1.appendChild(div2);
	document.body.appendChild(div1);

	domTranslator.translate(div1);
	await awaitTranslation();

	expect(div1.textContent).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
	expect(div2.textContent).toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	domTranslator.restore(div1);
	// check the text content of the element itself, because div1.textContent includes the text of child nodes
	expect(div1.childNodes[0].textContent).toBe(text1);
	expect(div2.childNodes[0].textContent).toBe(text2);
});

test('Callback is called after the node is restored', async () => {
	const callback = vi.fn();
	const domTranslator = new DOMTranslator(new NodesTranslator(translator), {
		filter: isTranslatableNode,
		scheduler: new IntersectionScheduler(),
	});

	const div = document.createElement('div');
	const text = 'Hello world';
	div.textContent = text;
	document.body.appendChild(div);

	// translate
	domTranslator.translate(div);
	await awaitTranslation();
	expect(div.textContent).toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	// restore
	domTranslator.restore(div, callback);
	expect(div.textContent).toBe(text);
	expect(callback.mock.calls).toEqual([[div.childNodes[0]]]);
});

test('Does not translate ignored node', async () => {
	const filter = (node: Node) => node.nodeName !== 'title';
	const domTranslator = new DOMTranslator(new NodesTranslator(translator), {
		filter,
		scheduler: new IntersectionScheduler(),
	});

	const div = document.createElement('div');
	div.textContent = 'I`m container node';
	const text = 'I`m title ';
	const attrNode = document.createAttribute('title');
	attrNode.nodeValue = text;
	div.setAttributeNode(attrNode);
	document.body.appendChild(div);

	domTranslator.translate(div);
	await awaitTranslation();

	expect(div.textContent).toMatch(startsWithRegex(TRANSLATION_SYMBOL));

	// not translated
	expect(attrNode.nodeValue).toBe(text);
	expect(attrNode.nodeValue).not.toMatch(startsWithRegex(TRANSLATION_SYMBOL));
});
