import { readFileSync } from 'fs';

import {
	awaitTranslation,
	containsRegex,
	endsWithRegex,
	startsWithRegex,
	TRANSLATION_SYMBOL,
	translator,
} from '../../__tests__/utils';
import { DOMTranslator } from '../../DOMTranslator';
import { IntersectionScheduler } from '../../IntersectionScheduler';
import { NodesTranslator } from '../../NodesTranslator';
import { createNodesFilter, NodesFilterOptions } from '../../utils/nodes';

import { PersistentDOMTranslator } from '..';

require('intersection-observer');

(IntersectionObserver.prototype as any).POLL_INTERVAL = 100;

const getElementText = (elm: Element | null) =>
	elm && elm.textContent ? elm.textContent.trim() : null;

const composeName = (...args: (string | boolean)[]) => args.filter(Boolean).join(' ');

const fillDocument = (text: string) => {
	document.write(text);
};

beforeEach(() => {
	document.body.innerHTML = '';
	vi.clearAllMocks();
});

describe('basic usage', () => {
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
			const persistentTranslator = new PersistentDOMTranslator(
				new DOMTranslator(new NodesTranslator(translator), {
					filter: createNodesFilter(),
					scheduler: lazyTranslate ? new IntersectionScheduler() : undefined,
				}),
			);
			persistentTranslator.translate(document.documentElement);

			await awaitTranslation();
			expect(document.documentElement.outerHTML).toMatchSnapshot();

			// Disable translation
			persistentTranslator.restore(document.documentElement);
			expect(document.documentElement.outerHTML).toBe(parsedHTML);
		});
	});
});

[true, false].forEach((isLazyTranslation) =>
	describe(
		'translation with consider translatable and ignored nodes' +
			(isLazyTranslation ? ' (lazy translation mode)' : ''),
		() => {
			const sample = readFileSync(__dirname + '/sample.html', 'utf8');

			const filterOptions = {
				attributesList: ['title', 'alt', 'placeholder', 'label', 'aria-label'],
				ignoredSelectors: [
					'meta',
					'link',
					'script',
					'noscript',
					'style',
					'code',
					'textarea',
				],
			} satisfies NodesFilterOptions;

			test('translate whole document', async () => {
				fillDocument(sample);
				const parsedHTML = document.documentElement.outerHTML;

				// Translate document
				const persistentTranslator = new PersistentDOMTranslator(
					new DOMTranslator(new NodesTranslator(translator), {
						filter: createNodesFilter(filterOptions),
						scheduler: isLazyTranslation
							? new IntersectionScheduler()
							: undefined,
					}),
				);

				persistentTranslator.translate(document.documentElement);

				await awaitTranslation();
				expect(document.documentElement.outerHTML).toMatchSnapshot();

				// Disable translation
				persistentTranslator.restore(document.documentElement);
				expect(document.documentElement.outerHTML).toBe(parsedHTML);
			});

			test('translate changed nodes', async () => {
				fillDocument(sample);

				// Translate document
				const persistentTranslator = new PersistentDOMTranslator(
					new DOMTranslator(new NodesTranslator(translator), {
						filter: createNodesFilter(filterOptions),
						scheduler: isLazyTranslation
							? new IntersectionScheduler()
							: undefined,
					}),
				);
				persistentTranslator.translate(document.documentElement);

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
				persistentTranslator.restore(document.documentElement);
				expect(div1.innerHTML).not.toMatch(startsWithRegex(TRANSLATION_SYMBOL));

				if (elmA !== null) {
					expect(elmA.innerHTML).not.toMatch(
						startsWithRegex(TRANSLATION_SYMBOL),
					);
					expect(elmA.getAttribute('title')).not.toMatch(
						startsWithRegex(TRANSLATION_SYMBOL),
					);
				}
			});

			test('translate multiple nodes', async () => {
				fillDocument(sample);

				// Translate document
				const persistentTranslator = new PersistentDOMTranslator(
					new DOMTranslator(new NodesTranslator(translator), {
						filter: createNodesFilter(filterOptions),
						scheduler: isLazyTranslation
							? new IntersectionScheduler()
							: undefined,
					}),
				);

				const pElm = document.querySelector('p');
				const form = document.querySelector('form');
				const figure = document.querySelector('figure');

				if (!pElm || !form || !figure)
					throw new Error('Not found elements for test');

				persistentTranslator.translate(form);
				persistentTranslator.translate(figure);

				await awaitTranslation();

				expect(getElementText(pElm)).not.toContain(TRANSLATION_SYMBOL);
				expect(getElementText(figure)).toContain(TRANSLATION_SYMBOL);
				expect(getElementText(form)).toContain(TRANSLATION_SYMBOL);

				// Disable translation
				persistentTranslator.restore(form);
				expect(getElementText(form)).not.toContain(TRANSLATION_SYMBOL);
				expect(getElementText(figure)).toContain(TRANSLATION_SYMBOL);

				persistentTranslator.restore(figure);
				expect(getElementText(form)).not.toContain(TRANSLATION_SYMBOL);
				expect(getElementText(figure)).not.toContain(TRANSLATION_SYMBOL);

				// Enable translation back
				persistentTranslator.translate(form);
				persistentTranslator.translate(figure);
				await awaitTranslation();

				expect(getElementText(figure)).toContain(TRANSLATION_SYMBOL);
				expect(getElementText(form)).toContain(TRANSLATION_SYMBOL);

				// Disable translation for all elements
				persistentTranslator.restore(form);
				persistentTranslator.restore(figure);
				expect(getElementText(form)).not.toContain(TRANSLATION_SYMBOL);
				expect(getElementText(figure)).not.toContain(TRANSLATION_SYMBOL);
			});

			test('use custom nodes filter', async () => {
				fillDocument(sample);

				// Translate document
				const persistentTranslator = new PersistentDOMTranslator(
					new DOMTranslator(new NodesTranslator(translator), {
						filter: createNodesFilter({
							...filterOptions,
							ignoredSelectors: [
								...filterOptions.ignoredSelectors,
								'[translate="no"], .notranslate, [contenteditable], [contenteditable="true"]',
								'.custom-elements :checked',
							],
						}),
						scheduler: isLazyTranslation
							? new IntersectionScheduler()
							: undefined,
					}),
				);

				persistentTranslator.translate(document.documentElement);

				await awaitTranslation();

				['[contenteditable]', '.notranslate', '[translate="no"]'].forEach(
					(selector) => {
						const element = document.querySelector(selector);
						expect(element).toBeInstanceOf(Element);
						expect(getElementText(element)).not.toMatch(
							containsRegex(TRANSLATION_SYMBOL),
						);
					},
				);

				// Considered even pseudo classes
				expect(
					document
						.querySelector('.custom-elements [type="checkbox"]:checked')
						?.getAttribute('title'),
				).not.toMatch(containsRegex(TRANSLATION_SYMBOL));
				expect(
					document
						.querySelector('.custom-elements [type="checkbox"]:not(:checked)')
						?.getAttribute('title'),
				).toMatch(containsRegex(TRANSLATION_SYMBOL));

				expect(document.documentElement.outerHTML).toMatchSnapshot();

				// Disable translation
				persistentTranslator.restore(document.documentElement);
			});

			describe('Case #147', () => {
				test('Elements with empty text is translated when text is inserted', async () => {
					// We trying to catch translator on incorrect "optimization" here.
					// If translator see "empty" node and say "ok, i don't care about it anymore",
					// it will lead us to problems with translating of dynamic elements.
					// For example, chat in Google Meet may create element with empty text first,
					// and then fill it with text. This test case is emulates described scenario.

					document.body.innerHTML = `<div id="root"><div id="foo">foo</div><div id="bar"></div></div>`;

					const rootElement = document.querySelector('#root');
					const fooElement = document.querySelector('#foo');
					const barElement = document.querySelector('#bar');

					// All elements found
					expect(rootElement).toBeInstanceOf(HTMLElement);
					expect(fooElement).toBeInstanceOf(HTMLElement);
					expect(barElement).toBeInstanceOf(HTMLElement);

					const translatorSpy = vi.fn(translator);
					const persistentTranslator = new PersistentDOMTranslator(
						new DOMTranslator(new NodesTranslator(translatorSpy), {
							// All attributes is not for translation
							// Our intention is to skip translation for node with id `bar`
							filter: (node) => !(node instanceof Attr),
							scheduler: isLazyTranslation
								? new IntersectionScheduler()
								: undefined,
						}),
					);

					// Translation runs fine
					await expect(
						Promise.all([
							persistentTranslator.translate(document.documentElement),
							awaitTranslation(),
						]),
					).resolves.not.toThrow();

					// All attributes is not translated
					expect(rootElement?.id).toBe('root');
					expect(fooElement?.id).toBe('foo');
					expect(barElement?.id).toBe('bar');

					// Node with text is translated
					expect(fooElement?.textContent).toMatch(
						startsWithRegex(TRANSLATION_SYMBOL),
					);

					// Node with no text stay with empty text (have no translation)
					expect(barElement?.textContent).toBe('');

					// We add empty text node that must not be translated (because no content for translation)
					const textNode = new Text('');
					barElement?.append(textNode);

					await awaitTranslation();
					expect(barElement?.textContent).toBe('');

					// Now we change value of empty text node
					// This text must be translated
					textNode.nodeValue = 'Another content';
					await awaitTranslation();
					expect(barElement?.textContent).toMatch(
						startsWithRegex(TRANSLATION_SYMBOL),
					);

					persistentTranslator.restore(document.documentElement);
				});

				test('Ignored nodes may be updated with no errors and no translator calls', async () => {
					document.body.innerHTML = `<div id="root"><div id="foo">foo</div><div id="bar">bar</div><div id="baz">baz</div></div>`;

					const rootElement = document.querySelector('#root');
					const fooElement = document.querySelector('#foo');
					const barElement = document.querySelector('#bar');
					const bazElement = document.querySelector('#baz');

					// All elements found
					expect(rootElement).toBeInstanceOf(HTMLElement);
					expect(fooElement).toBeInstanceOf(HTMLElement);
					expect(barElement).toBeInstanceOf(HTMLElement);
					expect(bazElement).toBeInstanceOf(HTMLElement);

					const translatorSpy = vi.fn(translator);
					const persistentTranslator = new PersistentDOMTranslator(
						new DOMTranslator(new NodesTranslator(translatorSpy), {
							filter: (node) => {
								if ((barElement as HTMLElement).contains(node))
									return false;
								if (
									node instanceof Attr &&
									node.ownerElement === barElement
								)
									return false;

								return true;
							},
							scheduler: isLazyTranslation
								? new IntersectionScheduler()
								: undefined,
						}),
					);

					// Translation runs fine
					await expect(
						Promise.all([
							persistentTranslator.translate(rootElement as HTMLElement),
							awaitTranslation(),
						]),
					).resolves.not.toThrow();

					// Translated all nodes except ignored
					expect((rootElement as HTMLElement).id).toMatch(
						startsWithRegex(TRANSLATION_SYMBOL),
					);
					expect((fooElement as HTMLElement).textContent).toMatch(
						startsWithRegex(TRANSLATION_SYMBOL),
					);
					expect((fooElement as HTMLElement).id).toMatch(
						startsWithRegex(TRANSLATION_SYMBOL),
					);
					expect((bazElement as HTMLElement).textContent).toMatch(
						startsWithRegex(TRANSLATION_SYMBOL),
					);
					expect((bazElement as HTMLElement).id).toMatch(
						startsWithRegex(TRANSLATION_SYMBOL),
					);

					expect((barElement as HTMLElement).textContent).not.toMatch(
						startsWithRegex(TRANSLATION_SYMBOL),
					);

					expect(translatorSpy).toBeCalledTimes(5);

					// Update of ignored node causes no translation calls or any errors
					expect(barElement?.id).toBe('bar');
					expect(barElement?.childNodes[0].textContent).toBe('bar');
					(barElement as HTMLElement).id = 'another-bar-id';
					(barElement as HTMLElement).childNodes[0].nodeValue =
						'another bar text';

					await expect(awaitTranslation()).resolves.not.toThrow();
					expect(translatorSpy).toBeCalledTimes(5);
					expect(barElement?.id).toBe('another-bar-id');
					expect(barElement?.childNodes[0].textContent).toBe(
						'another bar text',
					);
				});
			});
		},
	),
);
