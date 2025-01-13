import { DecorateNodes, IDecorateNodes } from './DecorateNodes';
import { XMutationObserver } from './lib/XMutationObserver';
import { Nodes } from './NodePrimitive';
import { Config, InnerConfig, TranslatorInterface } from './types';
import { configureTranslatableNodePredicate } from './utils/nodes';

// TODO: consider local language definitions (and implement `from`, `to` parameters for translator to specify default or locale languages)
// TODO: scan nodes lazy - defer scan to `requestIdleCallback` instead of instant scan
// TODO: describe nodes life cycle

/**
 * Module for dynamic translate a DOM nodes
 */
export class NodesTranslator {
	// private readonly translateCallback: TranslatorInterface;
	private readonly config: InnerConfig;

	private nodesManager: IDecorateNodes;

	private readonly observedNodesStorage = new Map<Element, XMutationObserver>();

	constructor(translateCallback: TranslatorInterface, config?: Config) {
		// this.translateCallback = translateCallback;
		this.config = {
			...config,
			isTranslatableNode:
				config?.isTranslatableNode ?? configureTranslatableNodePredicate(),
			lazyTranslate:
				config?.lazyTranslate !== undefined ? config?.lazyTranslate : true,
		};

		this.nodesManager = new DecorateNodes(
			new Nodes(translateCallback, this.config),
			this.config.isTranslatableNode,
		);
	}

	public observe(node: Element) {
		if (this.observedNodesStorage.has(node)) {
			throw new Error('Node already under observe');
		}

		// Observe node and childs changes
		const observer = new XMutationObserver();
		this.observedNodesStorage.set(node, observer);

		observer.addHandler('elementAdded', ({ target }) =>
			this.nodesManager.addNode(target),
		);
		observer.addHandler('elementRemoved', ({ target }) =>
			this.nodesManager.deleteNode(target),
		);
		observer.addHandler('characterData', ({ target }) => {
			this.nodesManager.updateNode(target);
		});
		observer.addHandler('changeAttribute', ({ target, attributeName }) => {
			if (attributeName === undefined || attributeName === null) return;
			if (!(target instanceof Element)) return;

			const attribute = target.attributes.getNamedItem(attributeName);

			if (attribute === null) return;

			// NOTE: If need delete untracked nodes, we should keep relates like Element -> attributes
			if (!this.nodesManager.isNodeStorageHas(attribute)) {
				this.nodesManager.addNode(attribute);
			} else {
				this.nodesManager.updateNode(attribute);
			}
		});

		observer.observe(node);
		this.nodesManager.addNode(node);
	}

	public unobserve(node: Element) {
		if (!this.observedNodesStorage.has(node)) {
			throw new Error('Node is not under observe');
		}

		this.nodesManager.deleteNode(node);
		this.observedNodesStorage.get(node)?.disconnect();
		this.observedNodesStorage.delete(node);
	}

	public getNodeData(node: Node) {
		this.nodesManager.getNodeData(node);
	}
}
