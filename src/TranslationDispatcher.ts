import { DOMNodesTranslator } from './DOMNodesTranslator';
import { IntersectingNodeObserver } from './IntersectingNodeObserver';
import { isIntersectableNode } from './utils/isIntersectableNode';
import { visitWholeTree } from './utils/visitWholeTree';

export type TranslatableNodePredicate = (node: Node) => boolean;

/**
 * Coordinates the processing of DOM nodes for translation.
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
		lazyTranslator?: IntersectingNodeObserver;
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
		// handle all nodes contained within the element (text nodes and attributes of the current and nested elements)
		if (node instanceof Element) {
			visitWholeTree(node, (node) => {
				if (node instanceof Element) return;

				this.translateNode(node);
			});
			return;
		}
		// Skip node if it does not satisfy the filter
		if (!this.filter(node)) return;

		// translate later or immediately
		if (this.lazyTranslator) {
			// Lazy translate when own element intersect viewport
			// But translate at once if node have not parent (virtual node) or parent node is outside of body (utility tags like meta or title)
			const isAttachedToDOM = node.getRootNode() !== node;
			const observableNode =
				node instanceof Attr ? node.ownerElement : node.parentElement;

			// Ignore lazy translation for non-intersecting nodes and translate it immediately
			if (
				isAttachedToDOM &&
				observableNode !== null &&
				isIntersectableNode(observableNode)
			) {
				this.lazyTranslator.attach(observableNode);
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
				this.lazyTranslator.detach(node);
			}
		}

		this.nodeTranslator.restoreNode(node);
	}
}
