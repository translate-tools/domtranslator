import { XMutationObserver } from './lib/XMutationObserver';
import { TranslationDispatcher } from './TranslationDispatcher';
import { visitWholeTree } from './utils/visitWholeTree';
import { DOMNodesTranslator } from '.';

// TODO: consider local language definitions (and implement `from`, `to` parameters for translator to specify default or locale languages)
// TODO: scan nodes lazy - defer scan to `requestIdleCallback` instead of instant scan
// TODO: describe nodes life cycle

/**
 * Module for dynamic translate a DOM nodes
 */
export class NodesTranslator {
	private readonly dispatcher;
	private readonly nodesTranslator;

	constructor({
		dispatcher,
		nodesTranslator: nodeTranslator,
	}: {
		dispatcher: TranslationDispatcher;
		nodesTranslator: DOMNodesTranslator;
	}) {
		this.dispatcher = dispatcher;
		this.nodesTranslator = nodeTranslator;
	}

	private mutatedNodes = new WeakSet<Node>();
	private saveTranslatedNode = (node: Node) => this.mutatedNodes.add(node);

	private readonly observedNodesStorage = new Map<Element, XMutationObserver>();
	public observe(node: Element) {
		if (this.observedNodesStorage.has(node)) {
			throw new Error('Node already under observe');
		}

		// Observe node and children changes
		const observer = new XMutationObserver();
		this.observedNodesStorage.set(node, observer);

		observer.addHandler('elementAdded', ({ target }) => {
			this.dispatcher.translateNode(target, this.saveTranslatedNode);
		});
		observer.addHandler('elementRemoved', ({ target }) => {
			this.dispatcher.restoreNode(target);
		});
		observer.addHandler('characterData', ({ target }) => {
			// skip this update if it was triggered by the translation itself
			if (this.mutatedNodes.has(target)) {
				this.mutatedNodes.delete(target);
				return;
			}
			this.dispatcher.updateNode(target, this.saveTranslatedNode);
		});
		observer.addHandler('changeAttribute', ({ target, attributeName }) => {
			if (attributeName === undefined || attributeName === null) return;
			if (!(target instanceof Element)) return;

			const attribute = target.attributes.getNamedItem(attributeName);

			if (attribute === null) return;

			// skip this update if it was triggered by the translation itself
			if (this.mutatedNodes.has(attribute)) {
				this.mutatedNodes.delete(attribute);
				return;
			}

			// NOTE: If need delete untracked nodes, we should keep relates like Element -> attributes
			if (!this.dispatcher.hasNode(attribute)) {
				this.dispatcher.translateNode(attribute, this.saveTranslatedNode);
			} else {
				this.dispatcher.updateNode(attribute, this.saveTranslatedNode);
			}
		});

		observer.observe(node);
		this.dispatcher.translateNode(node, this.saveTranslatedNode);
	}

	public unobserve(node: Element) {
		if (!this.observedNodesStorage.has(node)) {
			throw new Error('Node is not under observe');
		}

		// if clearing only remove the nodes related to the given node.
		visitWholeTree(node, (node) => {
			this.mutatedNodes.delete(node);
		});

		this.dispatcher.restoreNode(node);
		this.observedNodesStorage.get(node)?.disconnect();
		this.observedNodesStorage.delete(node);
	}

	public getNodeData(node: Node) {
		return this.nodesTranslator.getOriginalNodeText(node);
	}
}
