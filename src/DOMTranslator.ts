import { XMutationObserver } from './lib/XMutationObserver';
import { TranslationDispatcher } from './TranslationDispatcher';
import { isElementNode } from './utils/nodes';

/**
 * Module for dynamic translate a DOM nodes
 */
export class DOMTranslator {
	constructor(readonly dispatcher: TranslationDispatcher) {}

	// Stores nodes mutated as a result of translation
	// used to prevent handling mutation events triggered by our own translations
	private readonly mutatedNodes = new WeakSet<Node>();

	private readonly observedNodesStorage = new Map<Element, XMutationObserver>();
	public observe(node: Element) {
		if (this.observedNodesStorage.has(node)) {
			throw new Error('Node already under observe');
		}

		// Observe node and children changes
		const observer = new XMutationObserver();
		this.observedNodesStorage.set(node, observer);

		observer.addHandler('elementAdded', ({ target }) => {
			if (this.dispatcher.hasNode(target)) return;
			this.dispatcher.translateNode(target, (node: Node) =>
				this.mutatedNodes.add(node),
			);
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
			this.dispatcher.updateNode(target, (node: Node) =>
				this.mutatedNodes.add(node),
			);
		});
		observer.addHandler('changeAttribute', ({ target, attributeName }) => {
			if (!attributeName || !isElementNode(target)) return;

			const attribute = target.attributes.getNamedItem(attributeName);
			if (attribute === null) return;

			// skip this update if it was triggered by the translation itself
			if (this.mutatedNodes.has(attribute)) {
				this.mutatedNodes.delete(attribute);
				return;
			}

			// NOTE: If need delete untracked nodes, we should keep relates like Element -> attributes
			if (this.dispatcher.hasNode(attribute)) {
				this.dispatcher.updateNode(attribute, (node: Node) =>
					this.mutatedNodes.add(node),
				);
				return;
			}
			this.dispatcher.translateNode(attribute, (node: Node) =>
				this.mutatedNodes.add(node),
			);
		});

		observer.observe(node);

		this.dispatcher.translateNode(node, (node: Node) => this.mutatedNodes.add(node));
	}

	public unobserve(node: Element) {
		if (!this.observedNodesStorage.has(node)) {
			throw new Error('Node is not under observe');
		}

		// mutatedNodes may include nodes from multiple observed tree elements — remove only those belonging to the unobserved
		// restoreNode calls the callback after restoring each node; the callback removes that node from mutatedNodes
		this.dispatcher.restoreNode(node, (node) => {
			this.mutatedNodes.delete(node);
		});
		this.observedNodesStorage.get(node)?.disconnect();
		this.observedNodesStorage.delete(node);
	}
}
