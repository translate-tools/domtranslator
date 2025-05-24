import { readFileSync } from 'fs';

import { Config } from '../DefaultNodesTranslator';
import { DOMNodesTranslator, TranslatorInterface } from '../DOMNodesTranslator';
import { NodesIntersectionObserver } from '../lib/NodesIntersectionObserver';
import { NodesTranslator } from '../NodesTranslator';
import { TranslationDispatcher } from '../TranslationDispatcher';
import { configureTranslatableNodePredicate, NodesFilterOptions } from '../utils/nodes';

require('intersection-observer');

(IntersectionObserver.prototype as any).POLL_INTERVAL = 100;

const delay = (time: number) => new Promise((res) => setTimeout(res, time));
const awaitTranslation = () => delay(120);

const getElementText = (elm: Element | null) =>
	elm && elm.textContent ? elm.textContent.trim() : null;

const composeName = (...args: (string | boolean)[]) => args.filter(Boolean).join(' ');

const TRANSLATION_SYMBOL = '***TRANSLATED***';
const translator = async (text: string) => TRANSLATION_SYMBOL + text;

const escapeRegexString = (input: string) => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const startsWithRegex = (input: string) => new RegExp(`^${escapeRegexString(input)}`);
const endsWithRegex = (input: string) => new RegExp(`${escapeRegexString(input)}$`);
const containsRegex = (input: string) => new RegExp(`${escapeRegexString(input)}`);

const fillDocument = (text: string) => {
	document.write(text);
};

function buildTranslationServices(
	translateCallback: TranslatorInterface,
	config: { lazyTranslate: boolean; isTranslatableNode?: (node: Node) => boolean },
) {
	const isTranslatableNode =
		config.isTranslatableNode ?? configureTranslatableNodePredicate();

	const domNodesTranslator = new DOMNodesTranslator(translateCallback);

	const nodeIntersectionObserver = config.lazyTranslate
		? new NodesIntersectionObserver()
		: undefined;

	const translatorDispatcher = new TranslationDispatcher({
		filter: isTranslatableNode,
		nodeTranslator: domNodesTranslator,
		nodeIntersectionObserver,
	});

	return {
		nodeTranslator: domNodesTranslator,
		dispatcher: translatorDispatcher,
	};
}

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
			const domTranslator = new NodesTranslator({
				...buildTranslationServices(translator, {
					lazyTranslate,
				}),
			});
			domTranslator.observe(document.documentElement);

			await awaitTranslation();
			expect(document.documentElement.outerHTML).toMatchSnapshot();

			// Disable translation
			domTranslator.unobserve(document.documentElement);
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
				translatableAttributes: [
					'title',
					'alt',
					'placeholder',
					'label',
					'aria-label',
				],
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
			const options = {
				lazyTranslate: isLazyTranslation,
				isTranslatableNode: configureTranslatableNodePredicate(filterOptions),
			} satisfies Config;

			test('translate whole document', async () => {
				fillDocument(sample);
				const parsedHTML = document.documentElement.outerHTML;

				// Translate document
				const domTranslator = new NodesTranslator({
					...buildTranslationServices(translator, options),
				});
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
				const domTranslator = new NodesTranslator({
					...buildTranslationServices(translator, options),
				});
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
				const domTranslator = new NodesTranslator({
					...buildTranslationServices(translator, options),
				});

				const pElm = document.querySelector('p');
				const form = document.querySelector('form');
				const figure = document.querySelector('figure');

				if (!pElm || !form || !figure)
					throw new Error('Not found elements for test');

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

			test('use custom nodes filter', async () => {
				fillDocument(sample);

				// Translate document
				const { dispatcher, nodeTranslator } = buildTranslationServices(
					translator,
					{
						...options,
						isTranslatableNode: configureTranslatableNodePredicate({
							...filterOptions,
							ignoredSelectors: [
								...filterOptions.ignoredSelectors,
								'[translate="no"], .notranslate, [contenteditable], [contenteditable="true"]',
								'.custom-elements :checked',
							],
						}),
					},
				);
				const domTranslator = new NodesTranslator({
					dispatcher,
					nodeTranslator,
				});
				domTranslator.observe(document.documentElement);

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
			});
		},
	),
);
