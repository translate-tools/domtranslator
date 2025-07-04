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
		},
	),
);
