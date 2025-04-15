import { DomNodesTranslator } from './DomNodesTranslator';
import { LazyTranslator } from './LazyTranslator';
import { XMutationObserver } from './lib/XMutationObserver';
import { NodeStorage } from './NodeStorage';
import { handleTree } from './utils/handleTree';
import { isIntersectingNode } from './utils/isIntersectingNode';
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

		this.lazyTranslator = new LazyTranslator({
			isTranslatableNode: this.config.isTranslatableNode,
			translator: this.domTranslationProcessor.addNode,
		});
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
			handleTree(node, (node) => {
				if (node instanceof Element) return;

				if (this.config.isTranslatableNode(node)) {
					this.addNode(node);
				}
			});
			return;
		}

		// Ignore lazy translation for not introspectable nodes and translate it immediately
		if (this.config.lazyTranslate) {
			// Lazy translate when own element intersect viewport
			// But translate at once if node have not parent (virtual node) or parent node is outside of body (utility tags like meta or title)
			const isAttachedToDOM = node.getRootNode() !== node;
			const observableNode =
				node instanceof Attr ? node.ownerElement : node.parentElement;

			if (
				isAttachedToDOM &&
				observableNode !== null &&
				isIntersectingNode(observableNode)
			) {
				this.lazyTranslator.startObserving(observableNode);
				return;
			}
		}

		this.domTranslationProcessor.addNode(node);
	}

	private deleteNode(node: Node) {
		this.domTranslationProcessor.deleteNode(node);

		if (node instanceof Element) {
			this.lazyTranslator.stopObserving(node);
		}
	}
}
