import { NodesTranslator } from './NodesTranslator';
import { Config, TranslatorInterface } from './types';
import { configureTranslatableNodePredicate } from './utils/nodes';
import { DOMTranslator, LazyDOMTranslator, TranslationDispatcher } from '.';

/**
 * Module for dynamic translate a DOM nodes.
 * A preconfigured version of {@link NodesTranslator} with all necessary dependencies.
 */
export class DefaultNodesTranslator extends NodesTranslator {
	constructor(translateCallback: TranslatorInterface, config?: Config) {
		const innerConfig = {
			...config,
			isTranslatableNode:
				config?.isTranslatableNode ?? configureTranslatableNodePredicate(),
			lazyTranslate:
				config?.lazyTranslate !== undefined ? config?.lazyTranslate : true,
		};

		const domTranslator = new DOMTranslator(
			innerConfig.isTranslatableNode,
			translateCallback,
		);

		const lazyDOMTranslator = new LazyDOMTranslator(
			innerConfig.isTranslatableNode,
			domTranslator.translateNode,
		);

		super(
			new TranslationDispatcher({
				config: innerConfig,
				domTranslator: domTranslator,
				lazyDOMTranslator: lazyDOMTranslator,
			}),
			domTranslator,
		);
	}
}
