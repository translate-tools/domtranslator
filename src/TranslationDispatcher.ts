import { DOMNodesTranslator, NodeTranslatedCallback } from './DOMNodesTranslator';
import { NodesIntersectionObserver } from './lib/NodesIntersectionObserver';
import { visitWholeTree } from './utils/visitWholeTree';

export type TranslatableNodePredicate = (node: Node) => boolean;

/**
 * Coordinates the DOM nodes translation process.
 * Chooses between lazy and immediate translation; defaults to immediate if not provided.
 */
export class TranslationDispatcher {
	private readonly filter;
	private readonly nodesTranslator;
	private readonly nodeIntersectionObserver;

	constructor({
		nodesTranslator: nodesTranslator,
		filter,
		nodeIntersectionObserver,
	}: {
		nodesTranslator: DOMNodesTranslator;
		filter?: TranslatableNodePredicate;
		/**
		 * If nodeIntersectionObserver is provided, nodes can be translated delayed - after intersect the viewport
		 */
		nodeIntersectionObserver?: NodesIntersectionObserver;
	}) {
		this.filter = filter;
		this.nodesTranslator = nodesTranslator;
		this.nodeIntersectionObserver = nodeIntersectionObserver || null;
	}

	/**
	 * Translates the node and all its nested translatable nodes (text and attribute nodes)
	 */
	public translateNode(node: Node, callback?: NodeTranslatedCallback) {
		if (this.filter && !this.filter(node)) return;

		// Translate all nodes which element contains (text nodes and attributes of current and inner elements)
		if (node instanceof Element) {
			visitWholeTree(node, (node) => {
				if (node instanceof Element) return;
				this.translateNode(node, callback);
			});
			return;
		}

		// Handle text nodes and attributes

		// translate later if possible
		if (this.nodeIntersectionObserver) {
			// Check that the node is attached to the DOM. This means the node is accessible by traversing the current DOM
			// This check is necessary to avoid lazy translation for nodes that are detached from the DOM,
			// since they potentially may never intersect with the viewport

			const isAttachedToDOM = node.getRootNode() !== node;
			if (isAttachedToDOM) {
				this.nodeIntersectionObserver.observe(node, () => {
					this.nodesTranslator.translateNode(node, callback);
				});
				return;
			}
		}

		// translate immediately
		this.nodesTranslator.translateNode(node, callback);
	}

	/**
	 * Restores the original node text
	 */
	public restoreNode(node: Node, callback?: (node: Node) => void) {
		const restoreSingleNode = (node: Node) => {
			if (this.nodeIntersectionObserver) {
				this.nodeIntersectionObserver.unobserve(node);
			}
			this.nodesTranslator.restoreNode(node);

			if (callback) callback(node);
		};

		if (node instanceof Element) {
			visitWholeTree(node, restoreSingleNode);
		} else {
			restoreSingleNode(node);
		}
	}

	public updateNode(node: Node, callback?: NodeTranslatedCallback) {
		this.nodesTranslator.updateNode(node, callback);
	}

	public hasNode(node: Node) {
		return this.nodesTranslator.hasNode(node);
	}
}
