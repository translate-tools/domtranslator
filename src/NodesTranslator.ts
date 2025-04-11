import { DomNodesTranslator } from './DomTranslationProcessor';
import { LazyTranslator } from './LazyTranslator';
import { XMutationObserver } from './lib/XMutationObserver';
import { NodeStorage } from './NodeStorage';
import { configureTranslatableNodePredicate } from './utils/nodes';

export interface InnerConfig {
	isTranslatableNode: (node: Node) => boolean;
	lazyTranslate: boolean;
}

export interface Config {
	isTranslatableNode?: (node: Node) => boolean;
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
	private domTranslationProcessor: DomNodesTranslator;
	private lazyTranslator: LazyTranslator;

	private readonly observedNodesStorage = new Map<Element, XMutationObserver>();

	constructor(translateCallback: TranslatorInterface, config?: Config) {
		this.config = {
			...config,
			isTranslatableNode:
				config?.isTranslatableNode ?? configureTranslatableNodePredicate(),
			lazyTranslate:
				config?.lazyTranslate !== undefined ? config?.lazyTranslate : true,
		};

		this.domTranslationProcessor = new DomNodesTranslator(
			this.config.isTranslatableNode,
			new NodeStorage(),
			translateCallback,
		);

		this.lazyTranslator = new LazyTranslator(
			this.config.isTranslatableNode,
			this.domTranslationProcessor.addNode,
		);
	}

	public observe(node: Element) {
		if (this.observedNodesStorage.has(node)) {
			throw new Error('Node already under observe');
		}

		// Observe node and children changes
		const observer = new XMutationObserver();
		this.observedNodesStorage.set(node, observer);

		observer.addHandler('elementAdded', ({ target }) => this.addNode(target));
		observer.addHandler('elementRemoved', ({ target }) => this.deleteNode(target));
		observer.addHandler('characterData', ({ target }) => {
			this.domTranslationProcessor.updateNode(target);
		});
		observer.addHandler('changeAttribute', ({ target, attributeName }) => {
			if (attributeName === undefined || attributeName === null) return;
			if (!(target instanceof Element)) return;

			const attribute = target.attributes.getNamedItem(attributeName);

			if (attribute === null) return;

			// NOTE: If need delete untracked nodes, we should keep relates like Element -> attributes
			if (!this.domTranslationProcessor.isNodeStorageHas(attribute)) {
				this.addNode(attribute);
			} else {
				this.domTranslationProcessor.updateNode(attribute);
			}
		});

		observer.observe(node);
		this.addNode(node);
	}

	public unobserve(node: Element) {
		if (!this.observedNodesStorage.has(node)) {
			throw new Error('Node is not under observe');
		}

		this.deleteNode(node);
		this.observedNodesStorage.get(node)?.disconnect();
		this.observedNodesStorage.delete(node);
	}

	public getNodeData(node: Node) {
		return this.domTranslationProcessor.getOriginalNodeText(node);
	}

	private addNode(node: Node) {
		// handle all nodes contained within the element (text nodes and attributes of the current and nested elements)

		if (node instanceof Element) {
			this.domTranslationProcessor.processNodesInElement(node, (node) => {
				this.addNode(node);
			});
			return;
		}

		// if an element can't be translated later, translate it immediately

		if (this.config.lazyTranslate && this.lazyTranslator.isLazilyTranslatable(node)) {
			return;
		}

		// translate
		this.domTranslationProcessor.addNode(node);
	}

	private deleteNode(node: Node) {
		this.domTranslationProcessor.deleteNode(node);

		if (node instanceof Element) {
			this.lazyTranslator.disableLazyTranslation(node);
		}
	}
}
