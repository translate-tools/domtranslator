import { readFileSync } from 'fs';

import { NodesTranslator } from '../NodesTranslator';

require('intersection-observer');

(IntersectionObserver.prototype as any).POLL_INTERVAL = 100;

const delay = (time: number) => new Promise((res) => setTimeout(res, time));
const awaitTranslation = () => delay(120);

const getElementText = (elm: Element | null) =>
	elm && elm.textContent ? elm.textContent.trim() : null;

const composeName = (...args: (string | boolean)[]) => args.filter(Boolean).join(' ');

const TRANSLATION_SYMBOL = '***TRANSLATED***';
const translator = async (text: string) => TRANSLATION_SYMBOL + text;

function startsWithRegex(input: string): RegExp {
	// Escape any special regex characters in the input string
	const escapedInput = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	// Construct the regex to match strings starting with the escaped input
	return new RegExp(`^${escapedInput}`);
}
function endsWithRegex(input: string): RegExp {
	// Escape any special regex characters in the input string
	const escapedInput = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	// Construct the regex to match strings starting with the escaped input
	return new RegExp(`${escapedInput}$`);
}

const fillDocument = (text: string) => {
	// const div = document.createElement('div');
	// div.innerHTML = text;

	// document.append(div);
	document.write(text);
};

describe.only('basic usage', () => {
	const sample = readFileSync(__dirname + '/sample.html', 'utf8');

	[true, false].forEach((lazyTranslate) => {
		const testName = composeName(
			'translate whole document',
			lazyTranslate && 'with lazyTranslate',
		);
		test(testName, async () => {
			fillDocument(sample);
			const parsedHTML = document.documentElement.outerHTML;

			// Translate document
			const domTranslator = new NodesTranslator(translator, { lazyTranslate });
			domTranslator.observe(document.documentElement);

			await awaitTranslation();
			expect(document.documentElement.outerHTML).toMatchSnapshot();

			// Disable translation
			domTranslator.unobserve(document.documentElement);
			expect(document.documentElement.outerHTML).toBe(parsedHTML);
		});
	});
});

describe('usage with parameters', () => {
	const sample = readFileSync(__dirname + '/sample.html', 'utf8');

	const options = {
		lazyTranslate: false,
		translatableAttributes: ['title', 'alt', 'placeholder', 'label', 'aria-label'],
		ignoredTags: ['meta', 'link', 'script', 'noscript', 'style', 'code', 'textarea'],
	};

	test('translate whole document', async () => {
		fillDocument(sample);
		const parsedHTML = document.documentElement.outerHTML;

		// Translate document
		const domTranslator = new NodesTranslator(translator, options);
		domTranslator.observe(document.documentElement);

		await awaitTranslation();
		expect(document.documentElement.outerHTML).toMatchSnapshot();

		// Disable translation
		domTranslator.unobserve(document.documentElement);
		expect(document.documentElement.outerHTML).toBe(parsedHTML);
	});

	test('translate changed nodes', async () => {
		fillDocument(sample);

		// Translate document
		const domTranslator = new NodesTranslator(translator, options);
		domTranslator.observe(document.documentElement);

		await awaitTranslation();

		const div1 = document.createElement('div');
		document.body.appendChild(div1);

		div1.innerHTML = 'Text 1';
		await awaitTranslation();
		expect(div1.innerHTML).toMatch(startsWithRegex(TRANSLATION_SYMBOL));

		div1.innerHTML = 'Text 2';
		await awaitTranslation();
		expect(div1.innerHTML).toMatch(startsWithRegex(TRANSLATION_SYMBOL));

		const elmA = document.querySelector('a');
		expect(elmA).not.toBeNull();

		if (elmA !== null) {
			elmA.innerHTML = 'changed link text';
			elmA.setAttribute('title', 'changed title');
			elmA.setAttribute('href', 'changed url');

			await awaitTranslation();
			expect(elmA.innerHTML).toMatch(startsWithRegex(TRANSLATION_SYMBOL));
			expect(elmA.innerHTML).toMatch(endsWithRegex('changed link text'));

			expect(elmA.getAttribute('title')).toMatch(
				startsWithRegex(TRANSLATION_SYMBOL),
			);
			expect(elmA.getAttribute('href')).not.toMatch(
				startsWithRegex(TRANSLATION_SYMBOL),
			);
		}

		// Disable translation
		domTranslator.unobserve(document.documentElement);
		expect(div1.innerHTML).not.toMatch(startsWithRegex(TRANSLATION_SYMBOL));

		if (elmA !== null) {
			expect(elmA.innerHTML).not.toMatch(startsWithRegex(TRANSLATION_SYMBOL));
			expect(elmA.getAttribute('title')).not.toMatch(
				startsWithRegex(TRANSLATION_SYMBOL),
			);
		}
	});

	test('translate multiple nodes', async () => {
		fillDocument(sample);

		// Translate document
		const domTranslator = new NodesTranslator(translator, options);

		const pElm = document.querySelector('p');
		const form = document.querySelector('form');
		const figure = document.querySelector('figure');

		if (!pElm || !form || !figure) throw new Error('Not found elements for test');

		domTranslator.observe(form);
		domTranslator.observe(figure);

		await awaitTranslation();

		expect(getElementText(pElm)).not.toContain(TRANSLATION_SYMBOL);
		expect(getElementText(figure)).toContain(TRANSLATION_SYMBOL);
		expect(getElementText(form)).toContain(TRANSLATION_SYMBOL);

		// Disable translation
		domTranslator.unobserve(form);
		expect(getElementText(form)).not.toContain(TRANSLATION_SYMBOL);
		expect(getElementText(figure)).toContain(TRANSLATION_SYMBOL);

		domTranslator.unobserve(figure);
		expect(getElementText(form)).not.toContain(TRANSLATION_SYMBOL);
		expect(getElementText(figure)).not.toContain(TRANSLATION_SYMBOL);

		// Enable translation back
		domTranslator.observe(form);
		domTranslator.observe(figure);
		await awaitTranslation();

		expect(getElementText(figure)).toContain(TRANSLATION_SYMBOL);
		expect(getElementText(form)).toContain(TRANSLATION_SYMBOL);

		// Disable translation for all elements
		domTranslator.unobserve(form);
		domTranslator.unobserve(figure);
		expect(getElementText(form)).not.toContain(TRANSLATION_SYMBOL);
		expect(getElementText(figure)).not.toContain(TRANSLATION_SYMBOL);
	});
});
