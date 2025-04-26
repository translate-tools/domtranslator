import { XMutationObserver } from './lib/XMutationObserver';
import { TranslationDispatcher } from './TranslationDispatcher';

// TODO: consider local language definitions (and implement `from`, `to` parameters for translator to specify default or locale languages)
// TODO: scan nodes lazy - defer scan to `requestIdleCallback` instead of instant scan
// TODO: describe nodes life cycle

/**
 * Module for dynamic translate a DOM nodes
 */
export class NodesTranslator {
	constructor(
		private readonly translatorDispatcher: TranslationDispatcher, // private readonly domTranslator: DOMTranslator,
	) {}

	private readonly observedNodesStorage = new Map<Element, XMutationObserver>();
	public observe(node: Element) {
		if (this.observedNodesStorage.has(node)) {
			throw new Error('Node already under observe');
		}

		// Observe node and children changes
		const observer = new XMutationObserver();
		this.observedNodesStorage.set(node, observer);

		observer.addHandler('elementAdded', ({ target }) =>
			this.translatorDispatcher.translateNode(target),
		);
		observer.addHandler('elementRemoved', ({ target }) =>
			this.translatorDispatcher.restoreNode(target),
		);
		observer.addHandler('characterData', ({ target }) => {
			this.translatorDispatcher.updateNode(target);
		});
		observer.addHandler('changeAttribute', ({ target, attributeName }) => {
			if (attributeName === undefined || attributeName === null) return;
			if (!(target instanceof Element)) return;

			const attribute = target.attributes.getNamedItem(attributeName);

			if (attribute === null) return;

			// NOTE: If need delete untracked nodes, we should keep relates like Element -> attributes
			if (!this.translatorDispatcher.hasNode(attribute)) {
				this.translatorDispatcher.translateNode(attribute);
			} else {
				this.translatorDispatcher.updateNode(attribute);
			}
		});

		observer.observe(node);
		this.translatorDispatcher.translateNode(node);
	}

	public unobserve(node: Element) {
		if (!this.observedNodesStorage.has(node)) {
			throw new Error('Node is not under observe');
		}

		this.translatorDispatcher.restoreNode(node);
		this.observedNodesStorage.get(node)?.disconnect();
		this.observedNodesStorage.delete(node);
	}

	// public getNodeData(node: Node) {
	// 	return this.domTranslator.getOriginalNodeText(node);
	// }
}
