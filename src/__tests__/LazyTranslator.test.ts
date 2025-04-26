import { LazyDOMTranslator } from '../LazyDOMTranslator';
import { awaitTranslation, containsRegex, TRANSLATION_SYMBOL } from './utils';

require('intersection-observer');

const translator = vi.fn().mockImplementation(async (node: Node) => {
	node.textContent += TRANSLATION_SYMBOL;
});

const isTranslatableNode = (node: Node) => node instanceof Text || node instanceof Attr;

beforeEach(() => {
	document.body.innerHTML = '';
	vi.clearAllMocks();
});

test('Translate element from viewport', async () => {
	const div = document.createElement('div');
	div.innerHTML = 'Hello, World!';
	document.body.appendChild(div);

	const lazyTranslator = new LazyDOMTranslator({ isTranslatableNode, translator });

	lazyTranslator.attach(div);
	await awaitTranslation();

	// The mock function was called ones
	expect(translator.mock.calls).toHaveLength(1);
	expect(translator).toHaveBeenCalledWith(div.childNodes[0]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Translate one element twice', async () => {
	const div = document.createElement('div');
	div.innerHTML = 'Hello, World!';
	document.body.appendChild(div);

	const lazyTranslator = new LazyDOMTranslator({ isTranslatableNode, translator });
	lazyTranslator.attach(div);
	await awaitTranslation();

	expect(translator.mock.calls).toHaveLength(1);
	expect(translator).toHaveBeenCalledWith(div.childNodes[0]);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));

	// update element content
	const updatedText = 'Hello, World 12345!';
	div.innerHTML = updatedText;

	lazyTranslator.attach(div);
	await awaitTranslation();

	// translated text contains translated symbols and updated text
	expect(div.textContent).toMatch(updatedText);
	expect(div.textContent).toMatch(containsRegex(TRANSLATION_SYMBOL));
});

test('Does not translate elements if they are not attached to the DOM or not visible', async () => {
	const lazyTranslator = new LazyDOMTranslator({ isTranslatableNode, translator });

	// element not attach to DOM
	const div = document.createElement('div');
	div.innerHTML = 'Hello, world';

	lazyTranslator.attach(div);
	await awaitTranslation();

	expect(translator.mock.calls).toHaveLength(0);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));

	// Attach to the DOM; elements with display = 'none' should not be intersectable
	document.body.appendChild(div);
	// Hidden: Element with the visible property is considered intersectable, so use the display property instead.
	div.style.display = 'none';

	lazyTranslator.attach(div);
	await awaitTranslation();

	expect(translator.mock.calls).toHaveLength(0);
	expect(div.textContent).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
});
