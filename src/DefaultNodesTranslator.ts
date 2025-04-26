import { NodesTranslator } from './NodesTranslator';
import { configureTranslatableNodePredicate } from './utils/nodes';
import {
	DOMTranslator,
	LazyDOMTranslator,
	TranslatableNodePredicate,
	TranslationDispatcher,
	TranslatorInterface,
} from '.';

/**
 * Module for dynamic translate a DOM nodes.
 * A preconfigured version of {@link NodesTranslator} with all necessary dependencies.
 */
export class DefaultNodesTranslator extends NodesTranslator {
	constructor(
		translateCallback: TranslatorInterface,
		config?: {
			isTranslatableNode?: TranslatableNodePredicate;
			lazyTranslate?: boolean;
		},
	) {
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
