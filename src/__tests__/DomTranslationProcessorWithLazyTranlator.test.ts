import { readFileSync } from 'fs';

import { DomTranslationProcessor } from '../DomTranslationProcessor';
import { LazyTranslator } from '../LazyTranslator';

require('intersection-observer');

(IntersectionObserver.prototype as any).POLL_INTERVAL = 100;

const delay = (time: number) => new Promise((res) => setTimeout(res, time));
const awaitTranslation = () => delay(120);

const composeName = (...args: (string | boolean)[]) => args.filter(Boolean).join(' ');

const TRANSLATION_SYMBOL = '***TRANSLATED***';
const translator = async (text: string) => TRANSLATION_SYMBOL + text;

const escapeRegexString = (input: string) => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsRegex = (input: string) => new RegExp(`${escapeRegexString(input)}`);

const fillDocument = (text: string) => {
	document.write(text);
};

const sample = readFileSync(__dirname + '/sample.html', 'utf8');

describe('base usage', () => {
	[true, false].forEach((lazyTranslate) => {
		const testName = composeName(
			'translate whole document and disable translation',
			lazyTranslate && 'with lazyTranslate',
		);

		const config = {
			lazyTranslate: lazyTranslate,
			isTranslatableNode: (node: Node) => node instanceof Text,
		};

		test(testName, async () => {
			fillDocument(sample);

			const parsedHTML = document.documentElement.outerHTML;

			const domTranslationProcessor = new DomTranslationProcessor(
				config,
				new LazyTranslator(
					(node: Node) => domTranslationProcessor.handleNode(node),
					config,
				),
				translator,
			);

			// translate document
			domTranslationProcessor.addNode(document.documentElement);
			await awaitTranslation();
			expect(document.documentElement.outerHTML).toMatchSnapshot();

			// disable translation
			domTranslationProcessor.deleteNode(document.documentElement);
			expect(document.documentElement.outerHTML).toBe(parsedHTML);
		});

		const getNodeDataTestName = composeName(
			'getNodeData returns the original text',
			lazyTranslate && 'with lazyTranslate',
		);

		test(getNodeDataTestName, async () => {
			const originalText = 'Hello world!';

			const div0 = document.createElement('div');
			div0.innerHTML = originalText;

			const domTranslationProcessor = new DomTranslationProcessor(
				config,
				new LazyTranslator(
					(node: Node) => domTranslationProcessor.handleNode(node),
					config,
				),
				translator,
			);

			domTranslationProcessor.addNode(div0);

			await awaitTranslation();

			expect(domTranslationProcessor.getNodeData(div0.childNodes[0])).toEqual(
				expect.objectContaining({
					originalText: originalText,
				}),
			);
		});

		const updateNodeDataTestName = composeName(
			'updateNode should be called ones',
			lazyTranslate && 'with lazyTranslate',
		);

		test(updateNodeDataTestName, async () => {
			const div0 = document.createElement('div');
			div0.innerHTML = 'Hello world!';
			document.body.appendChild(div0);

			const domTranslationProcessor = new DomTranslationProcessor(
				config,
				new LazyTranslator(
					(node: Node) => domTranslationProcessor.handleNode(node),
					config,
				),
				translator,
			);
			// Spy on the updateNode method
			const updateNodesSpy = vi.spyOn(domTranslationProcessor, 'updateNode');

			domTranslationProcessor.addNode(div0);
			await awaitTranslation();

			// update element
			const newText = 'Goodbye world!';
			div0.innerHTML = newText;
			domTranslationProcessor.addNode(div0.childNodes[0]);
			await awaitTranslation();

			domTranslationProcessor.updateNode(div0.childNodes[0]);
			await awaitTranslation();

			expect(updateNodesSpy).toBeCalledTimes(1);
			expect(div0.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));
			expect(updateNodesSpy.mock.calls[0][0]).toMatchObject(
				containsRegex(TRANSLATION_SYMBOL),
			);
		});
	});
});
