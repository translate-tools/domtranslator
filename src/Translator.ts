import { NodeData } from './NodeStorage';
import { TranslatorInterface } from './NodesTranslator';
import { isInViewport } from './utils/isInViewport';

/**
 * The Translator class defines the translation logic
 */
export class Translator {
	private readonly translateCallback: TranslatorInterface;

	constructor(translateCallback: TranslatorInterface) {
		this.translateCallback = translateCallback;
	}

	/**
	 * Calculate node priority for translate, the bigger number the importance text
	 */
	public getNodePriority = (node: Node) => {
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
	};

	/**
	 * Call only for new and updated nodes
	 */
	public translateNode(node: Node, nodeData: NodeData) {
		if (node.nodeValue === null) return;

		// Recursion prevention
		if (nodeData.updateId <= nodeData.translateContext) {
			return;
		}

		const nodeId = nodeData.id;
		const nodeContext = nodeData.updateId;
		return this.translateCallback(node.nodeValue, nodeData.priority).then((text) => {
			// const actualNodeData = getNodeData(node);
			// const nodeData = nodeData;
			if (nodeData === undefined || nodeId !== nodeData.id) {
				return;
			}
			if (nodeContext !== nodeData.updateId) {
				return;
			}

			// actualNodeData.translateData = text;
			nodeData.originalText = node.nodeValue !== null ? node.nodeValue : '';
			nodeData.translateContext = nodeData.updateId + 1;
			node.nodeValue = text;
			return node;
		});
	}
}
