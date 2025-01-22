require('intersection-observer');

import { readFileSync } from 'fs';

import { LazyTranslator } from '../LazyTranslator';
import { NodesTranslator } from '../NodesTranslator';
import { configureTranslatableNodePredicate, NodesFilterOptions } from '../utils/nodes';
import {
	awaitTranslation,
	composeName,
	containsRegex,
	fillDocument,
	TRANSLATION_SYMBOL,
	translator,
} from './utils';

describe('basic usage', () => {
	const sample = readFileSync(__dirname + '/sample.html', 'utf8');

	[true, false].forEach((lazyTranslate) => {
		const testName = composeName(
			'translate whole document',
			lazyTranslate && 'with lazyTranslate',
		);

		const config = {
			isTranslatableNode: configureTranslatableNodePredicate(),
			lazyTranslate: lazyTranslate,
		};

		test(testName, async () => {
			fillDocument(sample);

			const parsedHTML = document.documentElement.outerHTML;

			const nodes = new NodesTranslator(
				translator,
				config,
				new LazyTranslator((node: Node) => {
					nodes.handleNode(node);
				}, config),
			);

			// Translate document
			nodes.addNode(document.documentElement);
			await awaitTranslation();

			expect(document.documentElement.outerHTML).toMatchSnapshot();

			// Disable translation
			nodes.deleteNode(document.documentElement);
			await awaitTranslation();

			expect(document.documentElement.outerHTML).toBe(parsedHTML);
		});
	});
});

describe('usage considering the translated nodes', () => {
	const sample = readFileSync(__dirname + '/sample.html', 'utf8');

	[true, false].forEach((lazyTranslate) => {
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

		const config = {
			isTranslatableNode: configureTranslatableNodePredicate(filterOptions),
			lazyTranslate: lazyTranslate,
		};

		const attributeTestName = composeName(
			'translate attributes',
			lazyTranslate && 'with lazyTranslate',
		);

		test(attributeTestName, async () => {
			fillDocument(sample);

			const parsedHTML = document.documentElement.outerHTML;

			const nodes = new NodesTranslator(
				translator,
				config,
				new LazyTranslator((node: Node) => {
					nodes.handleNode(node);
				}, config),
			);

			// translate attribute
			nodes.addNode(document.documentElement);
			await awaitTranslation();

			expect(document.documentElement.outerHTML).toMatchSnapshot();

			// disable translation
			nodes.deleteNode(document.documentElement);
			expect(document.documentElement.outerHTML).toBe(parsedHTML);
		});

		test('get original node data', async () => {
			const nodes = new NodesTranslator(
				translator,
				config,
				new LazyTranslator((node: Node) => {
					nodes.handleNode(node);
				}, config),
			);

			const originalAttributeText = 'title text';

			const div1 = document.createElement('div');
			div1.setAttribute('title', originalAttributeText);
			document.body.appendChild(div1);

			// translate node
			nodes.addNode(document.documentElement);
			await awaitTranslation();

			console.log(div1.getAttribute('title'));
			expect(div1.getAttribute('title')).toMatch(containsRegex(TRANSLATION_SYMBOL));

			// get original attribute text
			const attr = div1.getAttributeNode('title');
			if (!attr) {
				throw new Error('Not found elements for test');
			}
			expect(nodes.getNodeData(attr)).toMatchObject({
				originalText: originalAttributeText,
			});
		});
	});
});
