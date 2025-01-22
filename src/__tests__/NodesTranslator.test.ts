import { readFileSync } from 'fs';

import { LazyTranslator } from '../LazyTranslator';
import { NodesTranslator } from '../NodesTranslator';
import {
	awaitTranslation,
	composeName,
	containsRegex,
	TRANSLATION_SYMBOL,
	translator,
} from './utils';

require('intersection-observer');

const handelNode = vi.fn();

const fillDocument = (text: string) => {
	document.write(text);
};

const sample = readFileSync(__dirname + '/sample.html', 'utf8');

// The mock for LazyTranslate class
vi.mock('../LazyTranslator', async (importActual) => {
	return {
		...(await importActual()),

		LazyTranslator: vi.fn().mockImplementation(
			(
				handelNode: (node: Node) => void,
				config: {
					isTranslatableNode: (node: Node) => boolean;
					lazyTranslate: boolean;
				},
			) => {
				const lazyTranslationHandler = vi.fn().mockImplementation((node) => {
					if (config.lazyTranslate) {
						if (node.nodeName !== 'OPTION') {
							setTimeout(() => {}, 3000);
							return false;
						}
						// return false;
					}
					return true;
				});

				const stopLazyTranslation = vi.fn();

				return {
					lazyTranslationHandler,
					stopLazyTranslation,
				};
			},
		),
	};
});

describe('AddNode and deleteNode', () => {
	[true, false].forEach((lazyTranslate) => {
		const testName = composeName(
			'translate whole document',
			lazyTranslate && 'with lazyTranslate',
		);

		const config = {
			lazyTranslate: lazyTranslate,
			isTranslatableNode: (node: Node) => node instanceof Text,
		};

		test(testName, async () => {
			fillDocument(sample);

			const parsedHTML = document.documentElement.outerHTML;

			const nodesStorageTranslator = new NodesTranslator(
				translator,
				config,
				new LazyTranslator(handelNode, config),
			);

			// translate document
			nodesStorageTranslator.addNode(document.documentElement);
			await awaitTranslation();
			expect(document.documentElement.outerHTML).toMatchSnapshot();

			// disable translation
			nodesStorageTranslator.deleteNode(document.documentElement);
			expect(document.documentElement.outerHTML).toBe(parsedHTML);
		});
	});
});

describe('Update and getNodeData without using LazyTranslate', () => {
	const config = {
		lazyTranslate: false,
		isTranslatableNode: (node: Node) => node instanceof Text,
	};

	test('updateNode', async () => {
		const nodesStorageTranslator = new NodesTranslator(
			translator,
			config,
			new LazyTranslator(handelNode, config),
		);

		// Spy on the updateNode method
		const updateNodesSpy = vi.spyOn(nodesStorageTranslator, 'updateNode');

		const div0 = document.createElement('div');
		div0.innerHTML = 'Hello world!';
		document.body.appendChild(div0);

		nodesStorageTranslator.addNode(div0);

		await awaitTranslation();

		div0.innerHTML = 'Goodbye world!';
		nodesStorageTranslator.addNode(div0.childNodes[0]);

		await awaitTranslation();

		nodesStorageTranslator.updateNode(div0.childNodes[0]);

		expect(div0.innerHTML).toMatch(containsRegex(TRANSLATION_SYMBOL));

		expect(updateNodesSpy.mock.calls[0][0]).toMatchObject(
			containsRegex(TRANSLATION_SYMBOL),
		);
	});

	test('getNodeData returns the original text', async () => {
		const originalText = 'Hello world!';

		const nodesStorageTranslator = new NodesTranslator(
			translator,
			config,
			new LazyTranslator(handelNode, config),
		);

		const div0 = document.createElement('div');
		div0.innerHTML = originalText;

		nodesStorageTranslator.addNode(div0);

		await awaitTranslation();

		expect(nodesStorageTranslator.getNodeData(div0.childNodes[0])).toEqual(
			expect.objectContaining({
				originalText: originalText,
			}),
		);
	});
});

describe('Update and getNodeData with LazyTrnaslate', () => {
	const config = {
		lazyTranslate: true,
		isTranslatableNode: (node: Node) => node instanceof Text,
	};

	test('updateNode does not translate the node', async () => {
		const lazyTranslator = new LazyTranslator(handelNode, config);
		const nodesStorageTranslator = new NodesTranslator(
			translator,
			config,
			lazyTranslator,
		);

		// Spy on the updateNode method
		const updateMethodSpy = vi.spyOn(nodesStorageTranslator, 'updateNode');

		const div0 = document.createElement('div');
		div0.innerHTML = 'Hello world!';
		document.body.appendChild(div0);

		nodesStorageTranslator.addNode(div0);

		await awaitTranslation();

		nodesStorageTranslator.updateNode(div0.childNodes[0]);

		expect(updateMethodSpy).toHaveBeenCalledOnce();
		expect(updateMethodSpy.mock.calls[0][0]).toMatchObject(
			containsRegex(TRANSLATION_SYMBOL),
		);

		// LazyTranslationHandler returns false so the node will not be processed in the Nodes class
		// so the update method did not translate the updated node
		expect(lazyTranslator.lazyTranslationHandler).toReturnWith(false);
	});

	test('getNodeData return null', async () => {
		const lazyTranslator = new LazyTranslator(handelNode, config);
		const nodesStorageTranslator = new NodesTranslator(
			translator,
			config,
			lazyTranslator,
		);

		const div0 = document.createElement('div');
		div0.innerHTML = 'Hello world!';
		document.body.appendChild(div0);

		nodesStorageTranslator.addNode(div0);

		await awaitTranslation();

		// LazyTranslationHandler returns false so the node will not be processed in the Nodes class
		// so the getNode data cant return value
		expect(lazyTranslator.lazyTranslationHandler).toReturnWith(false);

		expect(nodesStorageTranslator.getNodeData(div0)).toBe(null);
	});
});
