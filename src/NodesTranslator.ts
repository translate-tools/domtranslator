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

	/**
	 * Stores the last value of a node (text or attribute). Used to detect recursive processing triggered by previous translations.
	 * A `null` node value indicates that the last change was intentional,
	 * and the next change should trigger processing again
	 */
	private lastNodesValue = new WeakMap<Node, string | null>();

	/**
	 * Executes the provided callback only if the node's current value differs from the previous value.
	 * This prevents recursive translation.
	 */
	private callHandler = (node: Node, callback: (node: Node) => void) => {
		const actualValue = node.nodeValue;
		const expectedValue = this.getLastNodeValue(node);

		// If the value hasn't changed, skip the callback and clear the store
		if (expectedValue !== undefined && actualValue === expectedValue) {
			this.setLastNodeValue(node, null);
			return;
		}

		callback(node);

		// Save the new value for future change detection
		this.setLastNodeValue(node, node.nodeValue);
	};

	private setLastNodeValue = (node: Node, value: string | null) =>
		this.lastNodesValue?.set(node, value);
	private getLastNodeValue = (node: Node) => this.lastNodesValue?.get(node);
	private deleteLastNodeValue = (node: Node) => this.lastNodesValue?.delete(node);
	private clearLastNodesValueStorage(node: Element) {
		visitWholeTree(node, () => {
			if (node instanceof Element) return;
			this.clearLastNodesValueStorage(node);
		});
		if (this.lastNodesValue.has(node)) {
			this.deleteLastNodeValue(node);
		}
	}

	private readonly observedNodesStorage = new Map<Element, XMutationObserver>();
	public observe(node: Element) {
		if (this.observedNodesStorage.has(node)) {
			throw new Error('Node already under observe');
		}

		// Observe node and children changes
		const observer = new XMutationObserver();
		this.observedNodesStorage.set(node, observer);

		observer.addHandler('elementAdded', ({ target }) => {
			this.callHandler(target, () => {
				this.dispatcher.translateNode(target);
			});
		});
		observer.addHandler('elementRemoved', ({ target }) => {
			this.deleteLastNodeValue(target);
			this.callHandler(target, () => {
				this.dispatcher.restoreNode(target);
			});
		});
		observer.addHandler('characterData', ({ target }) => {
			this.setLastNodeValue(target, target.nodeValue);
			this.callHandler(target, () => {
				this.dispatcher.updateNode(target);
			});
		});
		observer.addHandler('changeAttribute', ({ target, attributeName }) => {
			if (attributeName === undefined || attributeName === null) return;
			if (!(target instanceof Element)) return;

			const attribute = target.attributes.getNamedItem(attributeName);

			if (attribute === null) return;

			// If the value is null, it means the node has just been processed, and we should only handle the next changes.
			if (this.getLastNodeValue(attribute) !== null) {
				this.setLastNodeValue(attribute, attribute.value);
			}

			// NOTE: If need delete untracked nodes, we should keep relates like Element -> attributes
			if (!this.dispatcher.hasNode(attribute)) {
				this.callHandler(attribute, () => {
					this.dispatcher.translateNode(attribute);
				});
			} else {
				this.callHandler(attribute, () => {
					this.dispatcher.updateNode(attribute);
				});
			}
		});

		observer.observe(node);

		this.dispatcher.translateNode(node);
	}

	public unobserve(node: Element) {
		if (!this.observedNodesStorage.has(node)) {
			throw new Error('Node is not under observe');
		}

		this.dispatcher.restoreNode(node);
		this.observedNodesStorage.get(node)?.disconnect();
		this.observedNodesStorage.delete(node);
		this.clearLastNodesValueStorage(node);
	}

	public getNodeData(node: Node) {
		return this.nodeTranslator.getOriginalNodeText(node);
	}
}
