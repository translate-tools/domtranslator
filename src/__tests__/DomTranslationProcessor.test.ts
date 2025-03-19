import { readFileSync } from 'fs';

import { DomTranslationProcessor } from '../DomTranslationProcessor';
import { NodeStorage } from '../NodeStorage';
import {
	awaitTranslation,
	containsRegex,
	fillDocument,
	TRANSLATION_SYMBOL,
	translator,
} from './utils';

const sample = readFileSync(__dirname + '/sample.html', 'utf8');

describe('base usage', () => {
	let domTranslationProcessor: DomTranslationProcessor | null;

	beforeEach(() => {
		const isTranslatableNode = (node: Node) => node instanceof Text;

		domTranslationProcessor = new DomTranslationProcessor(
			isTranslatableNode,
			new NodeStorage(),
			translator,
		);
	});

	afterEach(() => {
		domTranslationProcessor = null;
	});

	test('transalate whole document', async () => {
		fillDocument(sample);

		const parsedHTML = document.documentElement.outerHTML;

		// handle all translatable nodes from element

		if (document.documentElement instanceof Element) {
			domTranslationProcessor?.processNodesInElement(
				document.documentElement,
				(node) => {
					domTranslationProcessor?.handleNode(node);
				},
			);
		}

		// translate document

		domTranslationProcessor?.handleNode(document.documentElement);
		await awaitTranslation();
		expect(document.documentElement.outerHTML).toMatchSnapshot();

		// disable translation

		domTranslationProcessor?.deleteNode(document.documentElement);
		expect(document.documentElement.outerHTML).toBe(parsedHTML);
	});

	test('getNodeData returns the original text', async () => {
		const originalText = 'Hello world!';

		const div0 = document.createElement('div');
		div0.innerHTML = originalText;

		// handle all translatable nodes from element

		if (div0 instanceof Element) {
			domTranslationProcessor?.processNodesInElement(div0, (node) => {
				domTranslationProcessor?.handleNode(node);
			});
		}

		// translate document

		domTranslationProcessor?.handleNode(div0);
		await awaitTranslation();

		expect(domTranslationProcessor?.getOriginalNodeText(div0.childNodes[0])).toEqual(
			expect.objectContaining({
				originalText: originalText,
			}),
		);
	});

	test('updateNode should be call ones', async () => {
		const div0 = document.createElement('div');
		div0.innerHTML = 'Hello world!';
		document.body.appendChild(div0);

		// Spy on the updateNode method
		const updateNodesSpy = vi.spyOn(
			domTranslationProcessor as DomTranslationProcessor,
			'updateNode',
		);

		// handle all translatable nodes from element

		if (div0 instanceof Element) {
			domTranslationProcessor?.processNodesInElement(div0, (node) => {
				domTranslationProcessor?.handleNode(node);
			});
		}

		domTranslationProcessor?.handleNode(div0);
		await awaitTranslation();

		// update element

		const newText = 'Goodbye world!';
		div0.innerHTML = newText;
		domTranslationProcessor?.handleNode(div0.childNodes[0]);
		await awaitTranslation();

		domTranslationProcessor?.updateNode(div0.childNodes[0]);
		await awaitTranslation();

		expect(div0.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));

		expect(updateNodesSpy).toBeCalledTimes(1);
		expect(updateNodesSpy.mock.calls[0][0]).toMatchObject(
			containsRegex(TRANSLATION_SYMBOL),
		);
	});
});
