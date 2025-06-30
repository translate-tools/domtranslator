import { DOMProcessor, ProcessedNodeCallback, StateStorage } from './types';
import { isInViewport } from './utils/isInViewport';
import { isAttributeNode, isTextNode } from './utils/nodes';

export type Translator = (text: string, priority: number) => Promise<string>;

export type NodeTranslationState = { originalText: string | null };

interface NodeData {
	/**
	 * Unique node identifier
	 */
	id: number;

	/**
	 * Each node update should increase the value
	 */
	updateId: number;

	/**
	 * Original node text, before start translation
	 * Contains `null` for node that not been translated yet
	 */
	originalText: null | string;

	/**
	 * Priority to translate node. The bigger the faster will translate
	 */
	priority: number;
}

/**
 * Calculate node priority for translate, the bigger number the importance text
 */
function getNodePriority(node: Node) {
	let score = 0;

	if (isAttributeNode(node)) {
		score += 1;
		const parent = node.ownerElement;
		if (parent && isInViewport(parent)) {
			// Attribute of visible element is important than text of non-visible element
			score += 2;
		}
	} else if (isTextNode(node)) {
		score += 2;
		const parent = node.parentElement;
		if (parent && isInViewport(parent)) {
			// Text of visible element is most important node for translation
			score += 2;
		}
	}

	return score;
}

/**
 * Manages translation state of DOM nodes.
 *
 * Class is purposed for translate primitive nodes.
 * It manages only node values itself, with no recursive processing nested nodes.
 */
export class NodesTranslator implements DOMProcessor, StateStorage<NodeTranslationState> {
	private idCounter = 0;
	private nodeStorage = new WeakMap<Node, NodeData>();

	constructor(private readonly translateCallback: Translator) {}

	public has(node: Node) {
		return this.nodeStorage.has(node);
	}

	public getState(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		if (!nodeData) return null;

		const { originalText } = nodeData;
		return { originalText };
	}

	/**
	 * Translates nodes that contain text (e.g., Text, Attr)
	 * After translation calls the callback with the translated node
	 */
	public process = (node: Node, callback?: ProcessedNodeCallback) => {
		if (this.has(node)) throw new Error('This node has already been translated');

		if (node.nodeType !== Node.ATTRIBUTE_NODE && node.nodeType !== Node.TEXT_NODE) {
			throw new Error(
				'Cannot translate node: only Text and Attr nodes are supported',
			);
		}

		// Skip empty text
		if (node.nodeValue === null || node.nodeValue.trim().length == 0) return;

		this.nodeStorage.set(node, {
			id: this.idCounter++,
			updateId: 1,
			originalText: null,
			priority: getNodePriority(node),
		});

		this.translateNodeContent(node, callback);
	};

	/**
	 * Restores the original node text
	 */
	public restore(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		if (!nodeData) return;

		if (nodeData.originalText !== null) {
			node.nodeValue = nodeData.originalText;
		}
		this.nodeStorage.delete(node);
	}

	/**
	 * Translates node after it has been modified
	 * After translation calls the callback with the translated node
	 */
	public update(node: Node, callback?: ProcessedNodeCallback) {
		const nodeData = this.nodeStorage.get(node);
		if (!nodeData)
			throw new Error('Node cannot be updated because it was never translated');

		nodeData.updateId++;
		this.translateNodeContent(node, callback);
	}

	/**
	 * Call only for new and updated nodes
	 */
	private translateNodeContent(node: Node, callback?: ProcessedNodeCallback) {
		const nodeData = this.nodeStorage.get(node);
		if (!nodeData) {
			throw new Error('Node is not register');
		}

		if (node.nodeValue === null) return;

		const nodeId = nodeData.id;
		const nodeContext = nodeData.updateId;
		return this.translateCallback(node.nodeValue, nodeData.priority).then((text) => {
			const actualNodeData = this.nodeStorage.get(node);
			if (!actualNodeData || nodeId !== actualNodeData.id) {
				return;
			}
			if (nodeContext !== actualNodeData.updateId) {
				return;
			}

			actualNodeData.originalText = node.nodeValue !== null ? node.nodeValue : '';
			node.nodeValue = text;

			if (callback) callback(node);
		});
	}
}
