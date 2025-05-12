import { DOMNodesTranslator } from './DOMNodesTranslator';
import { IntersectionObserverWithFilter } from './IntersectionObserverWithFilter';
import { isIntersectableNode } from './utils/isIntersectableNode';
import { visitWholeTree } from './utils/visitWholeTree';

export type TranslatableNodePredicate = (node: Node) => boolean;

/**
 * Coordinates the processing of DOM nodes for translation.
 * Uses intersectionObserverWithFilter to choose between lazy and immediate translation; defaults to immediate if not provided.
 */
export class TranslationDispatcher {
	private readonly isTranslatableNode;
	private readonly domNodesTranslator;
	// if dependency is not passed, then the node will not be translated lazy
	private readonly intersectionObserverWithFilter;

	constructor({
		isTranslatableNode,
		domNodesTranslator,
		intersectionObserverWithFilter,
	}: {
		isTranslatableNode: TranslatableNodePredicate;
		domNodesTranslator: DOMNodesTranslator;
		intersectionObserverWithFilter?: IntersectionObserverWithFilter;
	}) {
		this.isTranslatableNode = isTranslatableNode;
		this.domNodesTranslator = domNodesTranslator;
		this.intersectionObserverWithFilter = intersectionObserverWithFilter || null;
	}

	public updateNode(node: Node) {
		this.domNodesTranslator.updateNode(node);
	}

	public hasNode(node: Node) {
		return this.domNodesTranslator.hasNode(node);
	}
	/**
	 * Translates the given node and all its nested translatable nodes (text and attribute nodes)
	 */
	public translateNode(node: Node) {
		// Skip not translatable nodes
		if (!this.isTranslatableNode(node)) return;

		// handle all nodes contained within the element (text nodes and attributes of the current and nested elements)
		if (node instanceof Element) {
			visitWholeTree(node, (node) => {
				if (node instanceof Element) return;
				this.translateNode(node);
			});
			return;
		}

		// translate later or immediately
		if (this.intersectionObserverWithFilter) {
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
				this.intersectionObserverWithFilter.attach(observableNode);
				return;
			}
		}
		// translate immediately
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

			if (this.intersectionObserverWithFilter) {
				this.intersectionObserverWithFilter.detach(node);
			}
		}

		this.domNodesTranslator.restoreNode(node);
	}
}
