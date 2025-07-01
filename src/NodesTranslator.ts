import { DOMProcessor, ProcessedNodeCallback, StateStorage } from './types';
import { getNodeImportanceScore } from './utils/nodes';

export type Translator = (text: string, score: number) => Promise<string>;

export type NodeTranslationState = { originalText: string | null };

export interface INodesTranslator
	extends DOMProcessor,
		StateStorage<NodeTranslationState> {}

export type Config = {
	/**
	 * Function to score node importance
	 * @param node Target node to score
	 * @returns Score as number. The greater  - the important node are
	 */
	nodeImportanceScore?: (node: Node) => number;
};

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
	 * Node importance score for translate scheduling purposes.
	 * The greater the important node are and the faster should be translated
	 */
	importanceScore: number;
}

/**
 * Manages translation state of DOM nodes.
 *
 * Class is purposed for translate primitive nodes.
 * It manages only node values itself, with no recursive processing nested nodes.
 */
export class NodesTranslator implements INodesTranslator {
	private idCounter = 0;
	private nodeStorage = new WeakMap<Node, NodeData>();

	private readonly config;
	constructor(
		private readonly translateCallback: Translator,
		{ nodeImportanceScore = getNodeImportanceScore }: Config = {},
	) {
		this.config = {
			nodeImportanceScore,
		};
	}

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
			importanceScore: this.config.nodeImportanceScore(node),
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
		return this.translateCallback(node.nodeValue, nodeData.importanceScore).then(
			(text) => {
				const actualNodeData = this.nodeStorage.get(node);
				if (!actualNodeData || nodeId !== actualNodeData.id) {
					return;
				}
				if (nodeContext !== actualNodeData.updateId) {
					return;
				}

				actualNodeData.originalText =
					node.nodeValue !== null ? node.nodeValue : '';
				node.nodeValue = text;

				if (callback) callback(node);
			},
		);
	}
}
