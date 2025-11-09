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
		exportItem.deleteSelf()
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

	deleteSelf() {
		if(
			this.treeDict != null &&
			this.treeDict[this.path] != null
		) {
			this.treeDict[this.path].exportItem = null
		}

		const parentNode = this.elements.rootElement.parentNode
		if(parentNode != null) {
			parentNode.removeChild(
				this.elements.rootElement
			)
		}

		for(let i = this.itemIndex + 1; i < this.parentList.items.length; i++) {
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
			copyText(exportList.exportResult)
		})

		applyButtonListeners(this.exportAsTextElement, () => {
			exportList.exportEverything()
		})
	}

	addItem(path) {
		if(
			this.treeDict[path] == null ||
			this.treeDict[path].exportItem != null ||
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
	}

	// can't just say export because that's reserved by js
	exportEverything() {
		this.exportTextBlockElement.innerText = ""

console.log(this.items)
		for(const item of this.items) {
			if(this.treeDict[item.path] == null) { continue }

			const file = this.treeDict[item.path].fileItem
			const editorTab = this.treeDict[item.path].editorTab
			const fileType = this.fileTree.supportedFileTypes[file.fileTypeKey]

			if(!fileType.editorInterface.canChange) { continue }
			if(editorTab != null) {
				editorTab.saveFile()
			}
		}

		let exportParts = {}
		let files = []
		for(const itemIndex in this.items) {
			const item = this.items[itemIndex]
			if(this.treeDict[item.path] == null) {
				continue
			}

			const file = this.treeDict[item.path].fileItem
			const fileType = this.supportedFileTypes[file.fileTypeKey]
			const mime = file.getMime()

			const fileReader = new FileReader()
			fileReader.addEventListener("load", () => {
				if(exportParts[fileType.name] == null) {
					exportParts[fileType.name] = []
				}

				exportParts[fileType.name].push({
					exportPath: file.path,
					exportResult: fileType.onExport(
						fileReader.result,
						file.data,
						mime,
						file.path
					)
				})
			})

			console.log(`Added file reader for ${file.path}`)
			files.push({
				reader: fileReader,
				path: file.path,
				blob: new Blob(
					[ file.data ],
					{ type: `${mime};charset=utf-8` }
				)
			})
		}

		const exportList = this
		new Promise((resolve, reject) => {
			const checkIfDone = () => {
				if(files.length <= 0) {
					resolve()
					return
				}

				if(files[0].reader.readyState == FileReader.EMPTY) {
					files[0].reader.readAsDataURL(files[0].blob)
				} else if(files[0].reader.readyState == FileReader.DONE) {
					console.log(`Finished file read for ${files[0].path}`)
					files.splice(0, 1)
				}

				window.requestAnimationFrame(checkIfDone)
			}

			checkIfDone()
		}).then(() => {
			const extractExportParts = (...args) => {
				const categories = [ ...args ]

				let result = ""
				for(const category of categories) {
					if(exportParts[category] == null) { continue }

					for(const part of exportParts[category]) {
						console.log(`Exporting file: ${part.exportPath}`)

						// newlines and comments are meant to make checking the source html
						// in the web browser debugger easier
						result += (
							`\n` +
							`<!-- ${part.exportPath} -->\n` +
							`${part.exportResult}\n`
						)
					}

					exportParts[category] = null
				}

				return result
			}

			const extractRestOfExportParts = () => {
				return extractExportParts(...Object.keys(exportParts))
			}

			// newlines are meant to make checking the source html
			// in the web browser debugger easier
			exportList.exportResult = (
				"<!doctype html>\n" +
				"<html>\n" +
					"<head>\n" +
						`<title>${exportList.titleName}</title>\n` +
						`<meta charset="UTF-8" />\n` +
						`${extractExportParts("css")}\n` +
						`${extractExportParts("js")}\n` +
					"</head>\n" +
					"\n" +
					"<body>\n" +
						`${extractRestOfExportParts()}\n` +
					"</body>\n" +
				"</html>\n"
			)

			const blob = new Blob([
				new TextEncoder().encode(exportList.exportResult)
			], { type: "text/html;charset=utf-8" })

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

