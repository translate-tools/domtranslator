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
			isTranslatableNode:
				config?.isTranslatableNode ?? configureTranslatableNodePredicate(),
			lazyTranslate:
				config?.lazyTranslate !== undefined ? config?.lazyTranslate : true,
		};

		const domNodesTranslator = new DOMNodesTranslator({
			isTranslatableNode: innerConfig.isTranslatableNode,
			translateCallback,
		});

		// not create instance if param lazyTranslate falsy
		const lazyDOMTranslator = innerConfig.lazyTranslate
			? new IntersectionObserverWithFilter({
				filter: innerConfig.isTranslatableNode,
				onIntersected: domNodesTranslator.translateNode,
			  })
			: undefined;

		super({
			translatorDispatcher: new TranslationDispatcher({
				isTranslatableNode: innerConfig.isTranslatableNode,
				domNodesTranslator,
				lazyDOMTranslator,
			}),
			domNodesTranslator,
		});
	}
}
