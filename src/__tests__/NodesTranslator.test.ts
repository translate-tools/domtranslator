import { readFileSync } from 'fs';

import { NodesTranslator } from '../NodesTranslator';

const delay = (time: number) => new Promise((res) => setTimeout(res, time));
const awaitTranslation = () => delay(10);

const getElementText = (elm: Element | null) =>
	elm && elm.textContent ? elm.textContent.trim() : null;

const composeName = (...args: (string | boolean)[]) => args.filter(Boolean).join(' ');

const TRANSLATION_SYMBOL = '***TRANSLATED***';
const translator = async (text: string) => TRANSLATION_SYMBOL + text;

// TODO: add method to subscribe on queue updates and use it instead of timers for tests
beforeEach(() => {
	// IntersectionObserver isn't available in test environment
	class IntersectionObserverMock {
		private callback: IntersectionObserverCallback;
		constructor(
			callback: IntersectionObserverCallback,
			_options?: IntersectionObserverInit | undefined,
		) {
			this.callback = callback;
		}

		public observe = (target: Element) => {
			[target, ...Array.from(target.querySelectorAll('*'))].forEach((target) => {
				this.callback(
					[{ isIntersecting: true, target }] as IntersectionObserverEntry[],
					this as unknown as IntersectionObserver,
				);
			});
			return null;
		};
		public unobserve = (_target: Element) => {
			return null;
		};
		public disconnect = () => null;
	}

	window.IntersectionObserver =
		IntersectionObserverMock as unknown as typeof IntersectionObserver;
});

describe('basic usage', () => {
	const sample = readFileSync(__dirname + '/sample.html', 'utf8');

	[true, false].forEach((lazyTranslate) => {
		const testName = composeName(
			'translate whole document',
			lazyTranslate && 'with lazyTranslate',
		);
		test(testName, async () => {
			document.write(sample);
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
		document.write(sample);
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
		document.write(sample);

		// Translate document
		const domTranslator = new NodesTranslator(translator, options);
		domTranslator.observe(document.documentElement);

		await awaitTranslation();

		const div1 = document.createElement('div');
		document.body.appendChild(div1);

		div1.innerHTML = 'Text 1';
		await awaitTranslation();
		expect(div1.innerHTML).toStartWith(TRANSLATION_SYMBOL);

		div1.innerHTML = 'Text 2';
		await awaitTranslation();
		expect(div1.innerHTML).toStartWith(TRANSLATION_SYMBOL);

		const elmA = document.querySelector('a');
		expect(elmA).not.toBeNull();

		if (elmA !== null) {
			elmA.innerHTML = 'changed link text';
			elmA.setAttribute('title', 'changed title');
			elmA.setAttribute('href', 'changed url');

			await awaitTranslation();
			expect(elmA.innerHTML).toStartWith(TRANSLATION_SYMBOL);
			expect(elmA.innerHTML).toEndWith('changed link text');

			expect(elmA.getAttribute('title')).toStartWith(TRANSLATION_SYMBOL);
			expect(elmA.getAttribute('href')).not.toStartWith(TRANSLATION_SYMBOL);
		}

		// Disable translation
		domTranslator.unobserve(document.documentElement);
		expect(div1.innerHTML).not.toStartWith(TRANSLATION_SYMBOL);

		if (elmA !== null) {
			expect(elmA.innerHTML).not.toStartWith(TRANSLATION_SYMBOL);
			expect(elmA.getAttribute('title')).not.toStartWith(TRANSLATION_SYMBOL);
		}
	});

	test('translate multiple nodes', async () => {
		document.write(sample);

		// Translate document
		const domTranslator = new NodesTranslator(translator, options);

		const pElm = document.querySelector('p');
		const form = document.querySelector('form');
		const figure = document.querySelector('figure');

		if (!pElm || !form || !figure) throw new Error('Not found elements for test');

		domTranslator.observe(form);
		domTranslator.observe(figure);

		await awaitTranslation();

		expect(getElementText(pElm)).not.toInclude(TRANSLATION_SYMBOL);
		expect(getElementText(figure)).toInclude(TRANSLATION_SYMBOL);
		expect(getElementText(form)).toInclude(TRANSLATION_SYMBOL);

		// Disable translation
		domTranslator.unobserve(form);
		expect(getElementText(form)).not.toInclude(TRANSLATION_SYMBOL);
		expect(getElementText(figure)).toInclude(TRANSLATION_SYMBOL);

		domTranslator.unobserve(figure);
		expect(getElementText(form)).not.toInclude(TRANSLATION_SYMBOL);
		expect(getElementText(figure)).not.toInclude(TRANSLATION_SYMBOL);

		// Enable translation back
		domTranslator.observe(form);
		domTranslator.observe(figure);
		await awaitTranslation();

		expect(getElementText(figure)).toInclude(TRANSLATION_SYMBOL);
		expect(getElementText(form)).toInclude(TRANSLATION_SYMBOL);

		// Disable translation for all elements
		domTranslator.unobserve(form);
		domTranslator.unobserve(figure);
		expect(getElementText(form)).not.toInclude(TRANSLATION_SYMBOL);
		expect(getElementText(figure)).not.toInclude(TRANSLATION_SYMBOL);
	});
});
