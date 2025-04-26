import { DOMTranslator } from './DOMTranslator';
import { LazyDOMTranslator } from './LazyDOMTranslator';
import { XMutationObserver } from './lib/XMutationObserver';
import { TranslationDispatcher } from './TranslationDispatcher';
import { configureTranslatableNodePredicate } from './utils/nodes';

export type TranslatableNodePredicate = (node: Node) => boolean;

export interface InnerConfig {
	isTranslatableNode: TranslatableNodePredicate;
	lazyTranslate: boolean;
}

export interface Config {
	isTranslatableNode?: TranslatableNodePredicate;
	lazyTranslate?: boolean;
}

export type TranslatorInterface = (text: string, priority: number) => Promise<string>;

// TODO: consider local language definitions (and implement `from`, `to` parameters for translator to specify default or locale languages)
// TODO: scan nodes lazy - defer scan to `requestIdleCallback` instead of instant scan
// TODO: describe nodes life cycle

/**
 * Module for dynamic translate a DOM nodes
 */
export class NodesTranslator {
	private readonly config: InnerConfig;
	private translator: TranslationDispatcher;

	constructor(translateCallback: TranslatorInterface, config?: Config) {
		this.config = {
			...config,
			isTranslatableNode:
				config?.isTranslatableNode ?? configureTranslatableNodePredicate(),
			lazyTranslate:
				config?.lazyTranslate !== undefined ? config?.lazyTranslate : true,
		};

		const domNodeTranslator = new DOMTranslator(
			this.config.isTranslatableNode,
			translateCallback,
		);

		const lazyTranslator = new LazyDOMTranslator(
			this.config.isTranslatableNode,
			domNodeTranslator.translateNode,
		);

		this.translator = new TranslationDispatcher({
			config: this.config,
			domNodeTranslator,
			lazyTranslator,
		});
	}

	private readonly observedNodesStorage = new Map<Element, XMutationObserver>();
	public observe(node: Element) {
		if (this.observedNodesStorage.has(node)) {
			throw new Error('Node already under observe');
		}

		// Observe node and children changes
		const observer = new XMutationObserver();
		this.observedNodesStorage.set(node, observer);

		observer.addHandler('elementAdded', ({ target }) =>
			this.translator.translateNode(target),
		);
		observer.addHandler('elementRemoved', ({ target }) =>
			this.translator.restoreNode(target),
		);
		observer.addHandler('characterData', ({ target }) => {
			this.translator.updateNode(target);
		});
		observer.addHandler('changeAttribute', ({ target, attributeName }) => {
			if (attributeName === undefined || attributeName === null) return;
			if (!(target instanceof Element)) return;

			const attribute = target.attributes.getNamedItem(attributeName);

			if (attribute === null) return;

			// NOTE: If need delete untracked nodes, we should keep relates like Element -> attributes
			if (!this.translator.hasNode(attribute)) {
				this.translator.translateNode(attribute);
			} else {
				this.translator.updateNode(attribute);
			}
		});

		observer.observe(node);
		this.translator.translateNode(node);
	}

	public unobserve(node: Element) {
		if (!this.observedNodesStorage.has(node)) {
			throw new Error('Node is not under observe');
		}

		this.translator.restoreNode(node);
		this.observedNodesStorage.get(node)?.disconnect();
		this.observedNodesStorage.delete(node);
	}

	public getNodeData(node: Node) {
		return this.translator.getOriginalNodeText(node);
	}
}
