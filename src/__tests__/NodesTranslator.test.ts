import { readFileSync } from 'fs';

import { NodesTranslator } from '../NodesTranslator';

const delay = (time: number) => new Promise((res) => setTimeout(res, time));
const composeName = (...args: (string | boolean)[]) => args.filter(Boolean).join(' ');

const TRANSLATION_SYMBOL = '***TRANSLATED***';
const translator = async (text: string) => TRANSLATION_SYMBOL + text;

// TODO: add method to subscribe on queue updates and use it instead of timers for tests
beforeEach(() => {
	// IntersectionObserver isn't available in test environment
	// const mockIntersectionObserver = jest.fn();
	class IntersectionObserverMock {
		private callback: IntersectionObserverCallback;
		constructor(
			callback: IntersectionObserverCallback,
			_options?: IntersectionObserverInit | undefined,
		) {
			this.callback = callback;
		}

		public observe = (target: Element) => {
			// console.log('Elements', target.querySelectorAll('*'));
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
	};

	window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
});

describe('basic usage', () => {
	const sample = readFileSync(__dirname + '/sample.html', 'utf8');

	[true, false].forEach((lazyTranslate) => {
		const testName = composeName('translate whole document', lazyTranslate && 'with lazyTranslate');
		test(testName, async () => {
			document.write(sample);
			const parsedHTML = document.documentElement.outerHTML;

			// Translate document
			const domTranslator = new NodesTranslator(translator, { lazyTranslate });
			domTranslator.observe(document.documentElement);

			await delay(10);
			expect(document.documentElement.outerHTML).toMatchSnapshot();

			// Disable translation
			domTranslator.unobserve(document.documentElement);
			expect(document.documentElement.outerHTML).toBe(parsedHTML);
		});
	});
});

describe('usage with parameters', () => {
	const sample = readFileSync(__dirname + '/sample.html', 'utf8');

	test('translate whole document', async () => {
		document.write(sample);
		const parsedHTML = document.documentElement.outerHTML;

		// Translate document
		const domTranslator = new NodesTranslator(translator, {
			lazyTranslate: false,
			translatableAttributes: [
				"title",
				"alt",
				"placeholder",
				"label",
				"aria-label"
			],
			ignoredTags: [
				"meta",
				"link",
				"script",
				"noscript",
				"style",
				"code",
				"textarea"
			],
		});
		domTranslator.observe(document.documentElement);

		await delay(10);
		expect(document.documentElement.outerHTML).toMatchSnapshot();

		// Disable translation
		domTranslator.unobserve(document.documentElement);
		expect(document.documentElement.outerHTML).toBe(parsedHTML);
	});
});

// TODO: add tests with dynamic changes
