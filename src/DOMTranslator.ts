import { NodeTranslationState } from './NodesTranslator';
import {
	DOMTranslationDispatcher,
	DOMTranslationScheduler,
	ProcessedNodeCallback,
	StateStorage,
} from './types';
import { isElementNode } from './utils/nodes';
import { visitWholeTree } from './utils/visitWholeTree';

export interface IDomTranslator
	extends DOMTranslationDispatcher,
		StateStorage<NodeTranslationState> {
	restore(node: Node, callback?: (node: Node) => void): void;
}

type Config = {
	/**
	 * If is provided, nodes can be translated delayed - after intersect the viewport
	 */
	scheduler?: DOMTranslationScheduler;

	/**
	 * Determines which nodes should be translated
	 */
	filter?: (node: Node) => boolean;
};

/**
 * Translates DOM tree with filtering and optionally in lazy mode
 */
export class DOMTranslator implements IDomTranslator {
	constructor(
		private readonly nodesTranslator: DOMTranslationDispatcher &
			StateStorage<NodeTranslationState>,
		private readonly config: Config = {},
	) {}

	/**
	 * Translates DOM tree.
	 *
	 * If passed Element, all nested nodes (like Text, Attr, etc.) will be processed recursively.
	 *
	 * @param callback - Fires for each node, once it has been translated. Target node is passed as first argument
	 */
	public translate(node: Node, callback?: ProcessedNodeCallback) {
		const { scheduler, filter } = this.config;

		// Handle text nodes and attributes
		const translate = (node: Node) => {
			if (filter && !filter(node)) return;

			// translate later if possible
			if (scheduler) {
				// Check that the node is attached to the DOM. This means the node is accessible by traversing the current DOM
				// This check is necessary to avoid lazy translation for nodes that are detached from the DOM,
				// since they potentially may never intersect with the viewport

				const isAttachedToDOM = node.getRootNode() !== node;
				if (isAttachedToDOM) {
					scheduler.add(node, (node) => {
						this.nodesTranslator.translate(node, callback);
					});
					return;
				}
			}

			// translate immediately
			this.nodesTranslator.translate(node, callback);
		};

		// Translate all nodes which element contains (text nodes and attributes of current and inner elements)
		if (isElementNode(node)) {
			visitWholeTree(node, (node) => {
				if (isElementNode(node)) return;
				translate(node);
			});
		} else {
			translate(node);
		}
	}

	/**
	 * Restores the original nodes values in passed tree
	 *
	 * @param callback - Fires for each node, once it has been restored. Target node is passed as first argument
	 */
	public restore(node: Node, callback?: (node: Node) => void) {
		const { scheduler } = this.config;

		const restore = (node: Node) => {
			if (scheduler) {
				scheduler.remove(node);
			}

			this.nodesTranslator.restore(node);

			if (callback) callback(node);
		};

		// restore all nested nodes
		if (isElementNode(node)) {
			visitWholeTree(node, (node) => {
				if (isElementNode(node)) return;
				restore(node);
			});
		} else {
			restore(node);
		}
	}

	/**
	 * Re-translates a node after it has been modified.
	 *
	 * @param callback - Called asynchronously with the translated node once the update is complete
	 */
	public update(node: Node, callback?: ProcessedNodeCallback) {
		this.nodesTranslator.update(node, callback);
	}

	public has(node: Node) {
		return this.nodesTranslator.has(node);
	}

	public getState(node: Node) {
		return this.nodesTranslator.getState(node);
	}
}
