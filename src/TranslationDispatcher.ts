import { DOMNodesTranslator } from './DOMNodesTranslator';
import { IntersectionObserverWithFilter } from './IntersectionObserverWithFilter';
import { isIntersectableNode } from './utils/isIntersectableNode';
import { visitWholeTree } from './utils/visitWholeTree';

export type TranslatableNodePredicate = (node: Node) => boolean;

/**
 * Class coordinates the processing of DOM nodes for translation. Choose translation strategy: lazy or immediate.
 */
export class TranslationDispatcher {
	private readonly isTranslatableNode;
	private readonly domNodesTranslator;
	// if dependency is not passed, then the node will not be translated lazy
	private readonly lazyDOMTranslator;

	constructor({
		isTranslatableNode,
		domNodesTranslator,
		lazyDOMTranslator,
	}: {
		isTranslatableNode: TranslatableNodePredicate;
		domNodesTranslator: DOMNodesTranslator;
		lazyDOMTranslator?: IntersectionObserverWithFilter;
	}) {
		this.isTranslatableNode = isTranslatableNode;
		this.domNodesTranslator = domNodesTranslator;
		this.lazyDOMTranslator = lazyDOMTranslator || null;
	}

	public updateNode(node: Node) {
		this.domNodesTranslator.updateNode(node);
	}

	public hasNode(node: Node) {
		return this.domNodesTranslator.hasNode(node);
	}

	public translateNode(node: Node) {
		// handle all nodes contained within the element (text nodes and attributes of the current and nested elements)
		if (node instanceof Element) {
			visitWholeTree(node, (node) => {
				if (node instanceof Element) return;

				if (this.isTranslatableNode(node)) {
					this.translateNode(node);
				}
			});
			return;
		}

		// translate later or immediately
		if (this.lazyDOMTranslator) {
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
				this.lazyDOMTranslator.attach(observableNode);
				return;
			}
		}

		this.domNodesTranslator.translateNode(node);
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

			if (this.lazyDOMTranslator) {
				this.lazyDOMTranslator.detach(node);
			}
		}

		this.domNodesTranslator.restoreNode(node);
	}
}
