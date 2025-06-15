const applyExportItemElementsListeners = (elements, exportItem) => {
	applyButtonListeners(elements.deleteElement, onClickWrapper("deleteExportItemListener", exportItem))
	applyButtonListeners(elements.upElement, onClickWrapper("moveUpExportItemListener", exportItem))
	applyButtonListeners(elements.downElement, onClickWrapper("moveDownExportItemListener", exportItem))
}

const makeExportItemElements = (parentElement, exportItem) => {
	const elements = {
		deleteElement: null,
		upElement: null,
		downElement: null,
		nameElement: null,
		
		rootElement: null
	}

	elements.rootElement = cloneElement("exporter-list-item", parentElement)
	
	elements.deleteElement = elements.rootElement.children[0]
	elements.upElement = elements.rootElement.children[1]
	elements.downElement = elements.rootElement.children[2]
	elements.nameElement = elements.rootElement.children[3]
	elements.nameElement.innerHTML = exportItem.path
	
	applyExportItemElementsListeners(elements, exportItem)
	return elements
}

const getExportItemElements = (rootElement) => {
	return {
		deleteElement: rootElement.children[0],
		upElement: rootElement.children[1],
		downElement: rootElement.children[2],
		nameElement: rootElement.children[3],

		rootElement: rootElement
	}
}

class ExportItem {
	constructor(treeDict, path) {
		this.treeDict = treeDict
		this.path = path

		this.itemIndex = -1
		this.parentList = null
		this.elements = null

		treeDict[path].exportItem = this
	}

	deleteExportItemListener(exportItem) {
		exportItem.deleteExportItem()
	}

	moveUpExportItemListener(exportItem) {
		exportItem.parentList.relativeSwap(exportItem.itemIndex, -1)
	}

	moveDownExportItemListener(exportItem) {
		exportItem.parentList.relativeSwap(exportItem.itemIndex, 1)
	}

	updatePath(newPath) {
		if(this.treeDict == null) { return }
		
		this.path = newPath
		this.elements.nameElement.innerHTML = newPath
	}

	deleteExportItem() {
		const parentNode = this.elements.rootElement.parentNode
		if(parentNode != null) {
			parentNode.removeChild(
				this.elements.rootElement
			)
		}

		for(let i = this.itemIndex; i < this.parentList.items.length; i++) {
			this.parentList.items[i].itemIndex = i - 1
		}

		this.parentList.items.splice(this.itemIndex, 1)
	}

	setElements(parentElement, parentList) {
		this.parentList = parentList
		if(parentList != null) {
			this.itemIndex = parentList.items.length
		}

		this.elements = makeExportItemElements(parentElement, this)
		parentList.items.push(this)
	}

	applyListeners(rootElement) {
		this.elements = getExportItemElements(rootElement)
		applyExportItemElementsListeners(this.elements, this)
	}
}

class ExportList {
	constructor(column, fileTree) {
		this.fileTree = fileTree
		this.treeDict = fileTree.treeDict
		this.supportedFileTypes = fileTree.supportedFileTypes
		this.items = []

		this.titleName = "Untitled"
		this.titleNameElement = column.columnElement.children[2].children[1]
		
		this.exportAsTextElement = column.columnElement.children[3].children[0]
		this.exportDisplayElement = column.columnElement.children[4]
			this.exportCloseElement = column.columnElement.children[4].children[0].children[0]
			this.exportCopyElement = column.columnElement.children[4].children[0].children[1]
			this.exportTextBlockElement = column.columnElement.children[4].children[1]

		this.exportListElement = column.columnElement.children[6].children[0]
		this.exportResult = ""
		
		const exportList = this
		this.exportListAddElement = addExpandingButton(
			column.columnElement.children[6],
			"+",
			(userInput) => {
				exportList.addItem(userInput)
			}
		)

		this.titleNameElement.addEventListener("change", (event) => {
			exportList.titleName = event.target.value
		})

		applyButtonListeners(this.exportCloseElement, () => {
			exportList.exportDisplayElement.style.display = "none"
		})

		applyButtonListeners(this.exportCopyElement, () => {
			navigator.clipboard.writeText(exportList.exportResult)
		})

		applyButtonListeners(this.exportAsTextElement, () => {
			exportList.exportEverything()
		})
	}

	addItem(path) {
		if(
			this.treeDict[path] == null ||
			!this.treeDict[path].isFile
		) { return }
		
		const newExportItem = new ExportItem(this.treeDict, path)
		newExportItem.setElements(this.exportListElement, this)
	}

	// more for moving elements up and down
	relativeSwap(origIndex, indexOffset) {
		const offsetIndex = origIndex + indexOffset
		if(
			indexOffset == 0 ||
			offsetIndex < 0 ||
			offsetIndex > this.items.length - 1
		) { return }

		const origElement = this.exportListElement.children[origIndex].cloneNode(true)
		const offsetElement = this.exportListElement.children[offsetIndex].cloneNode(true)
		this.exportListElement.replaceChild(
			origElement,
			this.exportListElement.children[offsetIndex]
		)

		this.exportListElement.replaceChild(
			offsetElement,
			this.exportListElement.children[origIndex]
		)

		this.items[origIndex].applyListeners(origElement)
		this.items[offsetIndex].applyListeners(offsetElement)

		this.items[origIndex].itemIndex = offsetIndex
		this.items[offsetIndex].itemIndex = origIndex

		const temp = this.items[origIndex]
		this.items[origIndex] = this.items[offsetIndex]
		this.items[offsetIndex] = temp

		this.exportResult = ""
	}

	// can't just say export because that's reserved by js
	exportEverything() {
		for(const item of this.items) {
			const file = this.treeDict[item.path].fileItem
			const editorTab = this.treeDict[item.path].editorTab
			const fileType = this.fileTree.supportedFileTypes[file.fileTypeKey]
			
			if(!fileType.editorInterface.canChange) { continue }
			if(editorTab != null) {
				editorTab.saveFile()
			}
		}
		
		this.exportResult = (
			"<!doctype html>\n" +
			"<html>\n" +
				"<head>\n" +
					`<title>${this.titleName}</title>\n` +
				"</head>\n" +
				"\n" +
				"<body>\n"
		)

		let exportParts = []
		for(const itemIndex in this.items) {
			exportParts.push(null)
			
			const item = this.items[itemIndex]
			const file = this.treeDict[item.path].fileItem
			const fileType = this.supportedFileTypes[file.fileTypeKey]
			const mime = file.getMime()

			const fileReader = new FileReader()
			fileReader.addEventListener("load", () => {
				exportParts[itemIndex] = fileType.onExport(
					fileReader.result,
					file.data,
					mime,
					file.path
				)
			})

			const blob = new Blob([file.data], { type: mime })
			fileReader.readAsDataURL(blob)
		}

		const exportList = this
		new Promise((resolve, reject) => {
			const checkIfDone = () => {
				for(const part of exportParts) {
					if(part == null) {
						window.requestAnimationFrame(checkIfDone)
						return
					}
				}

				resolve()
			}

			checkIfDone()
		}).then(() => {
			for(const part of exportParts) {
				exportList.exportResult += part
			}
			
			exportList.exportResult += (
				"</body>\n" +
				"</html>\n" +
				"\n"
			)

			const blob = new Blob(
				[new TextEncoder().encode(exportList.exportResult)],
				{ type: "text/html" }
			)

			const fileReader = new FileReader()
			fileReader.addEventListener("load", () => {
				exportList.exportDisplayElement.style.display = "inherit"
				exportList.exportResult = fileReader.result
				exportList.exportTextBlockElement.innerText = exportList.exportResult
			})

			fileReader.readAsDataURL(blob)
		})
	}
}

