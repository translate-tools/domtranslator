import { XMutationObserver } from './lib/XMutationObserver';
import { TranslationDispatcher } from './TranslationDispatcher';
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

	private readonly expected = new WeakMap<Node, string | null>();

	private callHandler = (node: Node, callback: (node: Node) => void) => {
		const actualValue = node instanceof Attr ? node.value : node.nodeValue;
		const exp = this.getValue(node);

		if (exp !== undefined && actualValue == exp) {
			this.expected.set(node, null);
			return;
		}

		callback(node);

		this.setValue(node, node.nodeValue);
	};

	private setValue = (node: Node, value: string | null) =>
		this.expected.set(node, value);
	private getValue = (node: Node) => this.expected.get(node);
	private deleteValue = (node: Node) => this.expected.delete(node);

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
			this.deleteValue(target);
			this.callHandler(target, () => {
				this.dispatcher.restoreNode(target);
			});
		});
		observer.addHandler('characterData', ({ target }) => {
			this.setValue(target, target.nodeValue);
			this.callHandler(target, () => {
				this.dispatcher.updateNode(target);
			});
		});
		observer.addHandler('changeAttribute', ({ target, attributeName }) => {
			if (attributeName === undefined || attributeName === null) return;
			if (!(target instanceof Element)) return;

			const attribute = target.attributes.getNamedItem(attributeName);

			if (attribute === null) return;

			if (this.getValue(attribute) !== null) {
				this.setValue(attribute, attribute.value);
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
	}

	public getNodeData(node: Node) {
		return this.nodeTranslator.getOriginalNodeText(node);
	}
}
