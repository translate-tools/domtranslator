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
		const isTranslatableNode =
			config?.isTranslatableNode ?? configureTranslatableNodePredicate();
		const lazyTranslate =
			config?.lazyTranslate !== undefined ? config?.lazyTranslate : true;

		const domNodesTranslator = new DOMNodesTranslator(translateCallback);

		// not create instance if param lazyTranslate falsy
		const intersectionObserverWithFilter = lazyTranslate
			? new IntersectionObserverWithFilter({
				onIntersected: domNodesTranslator.translateNode,
			  })
			: undefined;

		const translatorDispatcher = new TranslationDispatcher({
			filter: isTranslatableNode,
			nodeTranslator: domNodesTranslator,
			lazyTranslator: intersectionObserverWithFilter,
		});

		super({
			translatorDispatcher,
			domNodesTranslator,
		});
	}
}
