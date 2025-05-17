import { DOMNodesTranslator } from './DOMNodesTranslator';
import { NodesIntersectionObserver } from './NodesIntersectionObserver';
import { visitWholeTree } from './utils/visitWholeTree';

export type TranslatableNodePredicate = (node: Node) => boolean;

/**
 * Coordinates the DOM nodes translation process.
 * Chooses between lazy and immediate translation; defaults to immediate if not provided.
 */
export class TranslationDispatcher {
	private readonly filter;
	private readonly nodeTranslator;
	// if dependency is not passed, then the node will not be translated lazy
	private readonly lazyTranslator;

	constructor({
		filter,
		nodeTranslator,
		lazyTranslator,
	}: {
		filter: TranslatableNodePredicate;
		nodeTranslator: DOMNodesTranslator;
		lazyTranslator?: NodesIntersectionObserver;
	}) {
		this.filter = filter;
		this.nodeTranslator = nodeTranslator;
		this.lazyTranslator = lazyTranslator || null;
	}

	public updateNode(node: Node) {
		this.nodeTranslator.updateNode(node);
	}

	public hasNode(node: Node) {
		return this.nodeTranslator.hasNode(node);
	}
	/**
	 * Translates the node and all its nested translatable nodes (text and attribute nodes)
	 */
	public translateNode(node: Node) {
		// Skip node if it does not satisfy the filter
		if (!this.filter(node)) return;

		// Translate all nodes which element contains (text nodes and attributes of current and inner elements)
		if (node instanceof Element) {
			visitWholeTree(node, (node) => {
				if (node instanceof Element) return;
				this.translateNode(node);
			});
			return;
		}

		// Handle text nodes and attributes

		if (this.lazyTranslator) {
			// if node is outside of body (utility tags like meta or title) translate immediately
			const isAttachedToDOM = node.getRootNode() !== node;
			if (isAttachedToDOM) {
				this.lazyTranslator.observe(node, (node: Node) => {
					this.nodeTranslator.translateNode(node);
				});
				return;
			}
		}
		// translate immediately
		this.nodeTranslator.translateNode(node);
	}

	/**
	 * Restores the original node text
	 * @param onlyTarget determines whether only the target node or all its nested nodes will be restored
	 */
	public restoreNode(node: Node, onlyTarget = false) {
		// Delete all attributes and inner nodes
		if (node instanceof Element && !onlyTarget) {
			visitWholeTree(node, (node) => {
				this.restoreNode(node, true);
			});

			if (this.lazyTranslator) {
				this.lazyTranslator.unobserve(node);
			}
		}

		this.nodeTranslator.restoreNode(node);
	}
}
