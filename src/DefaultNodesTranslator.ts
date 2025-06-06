import { DOMNodesTranslator, TranslatorInterface } from './DOMNodesTranslator';
import { NodesIntersectionObserver } from './lib/NodesIntersectionObserver';
import {
	TranslatableNodePredicate,
	TranslationDispatcher,
} from './TranslationDispatcher';
import { configureTranslatableNodePredicate } from './utils/nodes';
import { NodesTranslator } from '.';

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
		const lazyTranslate = config?.lazyTranslate ?? true;

		const domNodesTranslator = new DOMNodesTranslator(translateCallback);

		const nodeIntersectionObserver = lazyTranslate
			? new NodesIntersectionObserver()
			: undefined;

		const translatorDispatcher = new TranslationDispatcher({
			filter: isTranslatableNode,
			nodesTranslator: domNodesTranslator,
			nodeIntersectionObserver,
		});

		super({
			dispatcher: translatorDispatcher,
			nodesTranslator: domNodesTranslator,
		});
	}
}
