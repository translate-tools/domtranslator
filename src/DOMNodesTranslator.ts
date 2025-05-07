import { TranslatableNodePredicate } from './TranslationDispatcher';
import { isInViewport } from './utils/isInViewport';

export type TranslatorInterface = (text: string, priority: number) => Promise<string>;

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
	 * Contains `updateId` value at time when start node translation
	 */
	translateContext: number;

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

	if (node instanceof Attr) {
		score += 1;
		const parent = node.ownerElement;
		if (parent && isInViewport(parent)) {
			// Attribute of visible element is important than text of non-visible element
			score += 2;
		}
	} else if (node instanceof Text) {
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
 * Manages a translation state of DOM nodes. Translates text-containing nodes (Text, Attr, etc).
 * Registers nodes and initiates translation, updates the translation when a node is modified or deleted.
 */
export class DOMNodesTranslator {
	private idCounter = 0;
	private nodeStorage = new WeakMap<Node, NodeData>();

	private readonly isTranslatableNode;
	private readonly translateCallback;

	constructor({
		isTranslatableNode,
		translateCallback,
	}: {
		isTranslatableNode: TranslatableNodePredicate;
		translateCallback: TranslatorInterface;
	}) {
		this.isTranslatableNode = isTranslatableNode;
		this.translateCallback = translateCallback;
	}

	public hasNode(node: Node) {
		return this.nodeStorage.has(node);
	}

	public getOriginalNodeText(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		return nodeData ? nodeData.originalText : null;
	}

	/**
	 * Translate text-containing nodes (Text, Attr, etc)
	 */
	public translateNode = (node: Node) => {
		if (this.hasNode(node)) return;

		// Skip empty text
		if (node.nodeValue === null || node.nodeValue.trim().length == 0) return;

		// Skip not translatable nodes
		if (!this.isTranslatableNode(node)) return;

		this.nodeStorage.set(node, {
			id: this.idCounter++,
			updateId: 1,
			translateContext: 0,
			originalText: null,
			priority: getNodePriority(node),
		});

		this.translateNodeContent(node);
	};

	/**
	 * Restores the original node text
	 */
	public restoreNode(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		if (nodeData == undefined) return;

		// Restore original text if text been replaced
		if (nodeData.originalText !== null) {
			node.nodeValue = nodeData.originalText;
		}
		this.nodeStorage.delete(node);
	}

	/**
	 * Translates node after it has been modified
	 */
	public updateNode(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		if (nodeData == undefined) return;

		nodeData.updateId++;
		this.translateNodeContent(node);
	}

	/**
	 * Call only for new and updated nodes
	 */
	private translateNodeContent(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		if (!nodeData) {
			throw new Error('Node is not register');
		}

		if (node.nodeValue === null) return;

		// Recursion prevention
		if (nodeData.updateId <= nodeData.translateContext) {
			return;
		}

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
			actualNodeData.translateContext = actualNodeData.updateId + 1;
			node.nodeValue = text;
		});
	}
}
