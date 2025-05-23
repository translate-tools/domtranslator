import { XMutationObserver } from './lib/XMutationObserver';
import { TranslationDispatcher } from './TranslationDispatcher';
import { DOMNodesTranslator } from '.';

// TODO: consider local language definitions (and implement `from`, `to` parameters for translator to specify default or locale languages)
// TODO: scan nodes lazy - defer scan to `requestIdleCallback` instead of instant scan
// TODO: describe nodes life cycle

export type NodeTranslationHandler = (node: Node) => void;

/**
 * Module for dynamic translate a DOM nodes
 */
export class NodesTranslator {
	private readonly dispatcher;
	private readonly nodeTranslator;

	constructor({
		dispatcher,
		nodeTranslator,
	}: {
		dispatcher: TranslationDispatcher;
		nodeTranslator: DOMNodesTranslator;
	}) {
		this.dispatcher = dispatcher;
		this.nodeTranslator = nodeTranslator;
	}

	private translatedNodes = new WeakSet<Node>();
	private shouldSkipNode = (node: Node) => this.translatedNodes.has(node);
	private saveTranslatedNode = (node: Node) => this.translatedNodes.add(node);

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
			if (this.shouldSkipNode(target)) {
				this.translatedNodes.delete(target);
				return;
			}
			this.dispatcher.updateNode(target, this.saveTranslatedNode);
		});
		observer.addHandler('changeAttribute', ({ target, attributeName, oldValue }) => {
			if (attributeName === undefined || attributeName === null) return;
			if (!(target instanceof Element)) return;

			const attribute = target.attributes.getNamedItem(attributeName);

			if (attribute === null) return;

			// NOTE: If need delete untracked nodes, we should keep relates like Element -> attributes
			if (!this.dispatcher.hasNode(attribute)) {
				if (oldValue === attribute.value) {
					// if the node was replaced but has the same value, delete the old attribute from storage
					this.translatedNodes.delete(attribute);
				}
				this.dispatcher.translateNode(attribute, this.saveTranslatedNode);
			} else {
				// skip this update if it was triggered by the translation itself
				if (this.shouldSkipNode(attribute)) {
					this.translatedNodes.delete(attribute);
					return;
				}
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

		this.dispatcher.restoreNode(node);
		this.observedNodesStorage.get(node)?.disconnect();
		this.observedNodesStorage.delete(node);
	}

	public getNodeData(node: Node) {
		return this.nodeTranslator.getOriginalNodeText(node);
	}
}
