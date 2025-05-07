import { DOMNodesTranslator } from './DOMNodesTranslator';
import { IntersectionObserverWithFilter } from './IntersectionObserverWithFilter';
import { isIntersectableNode } from './utils/isIntersectableNode';
import { visitWholeTree } from './utils/visitWholeTree';

export type TranslatableNodePredicate = (node: Node) => boolean;

/**
 * Class coordinates the processing of DOM nodes for translation.
 * If intersectionObserverWithFilter is passed, class selects the translation strategy: lazy or immediate.
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
	 * Translates nodes contained in an element (text nodes and attributes of current and inner elements)
	 */
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
