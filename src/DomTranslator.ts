import { LazyTranslator } from './LazyTranslator';
import { XMutationObserver } from './lib/XMutationObserver';
import { NodesTranslator } from './NodesTranslator';
import { Config, InnerConfig, TranslatorInterface } from './types';
import { configureTranslatableNodePredicate } from './utils/nodes';

// TODO: consider local language definitions (and implement `from`, `to` parameters for translator to specify default or locale languages)
// TODO: scan nodes lazy - defer scan to `requestIdleCallback` instead of instant scan
// TODO: describe nodes life cycle

/**
 * Module for dynamic translate a DOM nodes
 */
export class DomTranslator {
	private readonly config: InnerConfig;

	private nodes: NodesTranslator;

	private readonly observedNodesStorage = new Map<Element, XMutationObserver>();

	constructor(translateCallback: TranslatorInterface, config?: Config) {
		this.config = {
			...config,
			isTranslatableNode:
				config?.isTranslatableNode ?? configureTranslatableNodePredicate(),
			lazyTranslate:
				config?.lazyTranslate !== undefined ? config?.lazyTranslate : true,
		};

		this.nodes = new NodesTranslator(
			translateCallback,
			this.config,
			new LazyTranslator((node: Node) => {
				this.nodes.handleNode(node);
			}, this.config),
		);
	}

	public observe(node: Element) {
		if (this.observedNodesStorage.has(node)) {
			throw new Error('Node already under observe');
		}

		// Observe node and childs changes
		const observer = new XMutationObserver();
		this.observedNodesStorage.set(node, observer);

		observer.addHandler('elementAdded', ({ target }) => this.nodes.addNode(target));
		observer.addHandler('elementRemoved', ({ target }) =>
			this.nodes.deleteNode(target),
		);
		observer.addHandler('characterData', ({ target }) => {
			this.nodes.updateNode(target);
		});
		observer.addHandler('changeAttribute', ({ target, attributeName }) => {
			if (attributeName === undefined || attributeName === null) return;
			if (!(target instanceof Element)) return;

			const attribute = target.attributes.getNamedItem(attributeName);

			if (attribute === null) return;

			// NOTE: If need delete untracked nodes, we should keep relates like Element -> attributes
			if (!this.nodes.isNodeStorageHas(attribute)) {
				this.nodes.addNode(attribute);
			} else {
				this.nodes.updateNode(attribute);
			}
		});

		observer.observe(node);
		this.nodes.addNode(node);
	}

	public unobserve(node: Element) {
		if (!this.observedNodesStorage.has(node)) {
			throw new Error('Node is not under observe');
		}

		this.nodes.deleteNode(node);
		this.observedNodesStorage.get(node)?.disconnect();
		this.observedNodesStorage.delete(node);
	}

	public getNodeData(node: Node) {
		this.nodes.getNodeData(node);
	}
}
