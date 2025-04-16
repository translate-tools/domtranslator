import { DomNodeTranslator } from './DomNodeTranslator';
import { LazyTranslator } from './LazyTranslator';
import { XMutationObserver } from './lib/XMutationObserver';
import { TranslationManager } from './TranslationManager';
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
	private translator: TranslationManager;

	private readonly observedNodesStorage = new Map<Element, XMutationObserver>();

	constructor(translateCallback: TranslatorInterface, config?: Config) {
		this.config = {
			...config,
			isTranslatableNode:
				config?.isTranslatableNode ?? configureTranslatableNodePredicate(),
			lazyTranslate:
				config?.lazyTranslate !== undefined ? config?.lazyTranslate : true,
		};

		const domTranslationProcessor = new DomNodeTranslator(
			this.config.isTranslatableNode,
			translateCallback,
		);

		const lazyTranslator = new LazyTranslator({
			isTranslatableNode: this.config.isTranslatableNode,
			translator: domTranslationProcessor.addNode,
		});

		this.translator = new TranslationManager({
			config: this.config,
			domTranslationProcessor,
			lazyTranslator,
		});
	}

	public observe(node: Element) {
		if (this.observedNodesStorage.has(node)) {
			throw new Error('Node already under observe');
		}

		// Observe node and children changes
		const observer = new XMutationObserver();
		this.observedNodesStorage.set(node, observer);

		observer.addHandler('elementAdded', ({ target }) =>
			this.translator.addNode(target),
		);
		observer.addHandler('elementRemoved', ({ target }) =>
			this.translator.deleteNode(target),
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
			if (!this.translator.isNodeStorageHas(attribute)) {
				this.translator.addNode(attribute);
			} else {
				this.translator.updateNode(attribute);
			}
		});

		observer.observe(node);
		this.translator.addNode(node);
	}

	public unobserve(node: Element) {
		if (!this.observedNodesStorage.has(node)) {
			throw new Error('Node is not under observe');
		}

		this.translator.deleteNode(node);
		this.observedNodesStorage.get(node)?.disconnect();
		this.observedNodesStorage.delete(node);
	}
}
