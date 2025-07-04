import { IDomTranslator } from '../DOMTranslator';
import { isElementNode } from '../utils/nodes';
import { XMutationObserver } from '../utils/XMutationObserver';

/**
 * Translates DOM tree persistently. When nodes in tree is updates, it will be automatically translated.
 */
export class PersistentDOMTranslator {
	constructor(readonly translator: IDomTranslator) {}

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
			if (this.translator.has(target)) return;
			this.translator.translate(target, (node: Node) =>
				this.mutatedNodes.add(node),
			);
		});
		observer.addHandler('elementRemoved', ({ target }) => {
			this.translator.restore(target);
		});
		observer.addHandler('characterData', ({ target }) => {
			// skip this update if it was triggered by the translation itself
			if (this.mutatedNodes.has(target)) {
				this.mutatedNodes.delete(target);
				return;
			}
			this.translator.update(target, (node: Node) => this.mutatedNodes.add(node));
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
			if (this.translator.has(attribute)) {
				this.translator.update(attribute, (node: Node) =>
					this.mutatedNodes.add(node),
				);
				return;
			}
			this.translator.translate(attribute, (node: Node) =>
				this.mutatedNodes.add(node),
			);
		});

		observer.observe(node);

		this.translator.translate(node, (node: Node) => this.mutatedNodes.add(node));
	}

	public unobserve(node: Element) {
		if (!this.observedNodesStorage.has(node)) {
			throw new Error('Node is not under observe');
		}

		// mutatedNodes may include nodes from multiple observed tree elements — remove only those belonging to the unobserved
		// restoreNode calls the callback after restoring each node; the callback removes that node from mutatedNodes
		this.translator.restore(node, (node) => {
			this.mutatedNodes.delete(node);
		});
		this.observedNodesStorage.get(node)?.disconnect();
		this.observedNodesStorage.delete(node);
	}
}
