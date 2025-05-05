import { TranslatorInterface } from './DOMNodesTranslator';
import { NodesTranslator } from './NodesTranslator';
import { configureTranslatableNodePredicate } from './utils/nodes';
import {
	DOMNodesTranslator,
	IntersectionObserverWithFilter,
	TranslatableNodePredicate,
	TranslationDispatcher,
} from '.';

export interface Config {
	isTranslatableNode?: TranslatableNodePredicate;
	lazyTranslate?: boolean;
}

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

		const domTranslator = new DOMNodesTranslator({
			isTranslatableNode: innerConfig.isTranslatableNode,
			translateCallback,
		});

		const lazyDOMTranslator = new IntersectionObserverWithFilter({
			filter: innerConfig.isTranslatableNode,
			onIntersected: domTranslator.translateNode,
		});

		super({
			translatorDispatcher: new TranslationDispatcher({
				config: innerConfig,
				domTranslator: domTranslator,
				lazyDOMTranslator: lazyDOMTranslator,
			}),
			domTranslator,
		});
	}
}
