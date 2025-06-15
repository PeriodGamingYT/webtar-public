class TreeDictFileItem {
	constructor(fileItem) {
		this.isFile = true
		
		this.fileItem = fileItem
		this.exportItem = null
		this.editorTab = null
	}
}

class TreeDictFolderItem {
	constructor(folderItem) {
		this.isFile = false

		this.folderItem = folderItem
	}
}

class FileTree {
	constructor(
		fileTreeColumn, 
		exporterColumn,
		editorColumn
	) {
		this.treeDict = {}
	
		const fileTreeElement = fileTreeColumn.columnElement.children[4]
		this.rootFolder = new Folder("root")

		this.supportedFileTypes = {}

		// check genericMime first, then specific if generic is null
		this.genericMimeToFileType = {}
		this.specificMimeToFileType = {}
		this.setSupportedFileTypes(
			new FileType(
				"text", "Text", "text/plain",
				textEditorInterface, 
				(dataUrl, bytes, mime, pathName) => {
					const text = new TextDecoder().decode(bytes)
					return (
						`<span id=${pathName} style="display: none;">${text}</span>`
					)
				}
			),
			
			new FileType(
				"font", "Font", "font/*",
				fontReaderInterface, 
				(dataUrl, bytes, mime, pathName) => {
					return (
						"<style>\n" +
							"@font-face {\n" +
								`font-family: "${pathName}";\n` +
								`src: url("${dataUrl}");\n` +
							"}\n" +
						"</style>"
					)
				}
			),



			new FileType(
				"image", "Image", "image/*",
				imageReaderInterface, 
				(dataUrl, bytes, mime, pathName) => {
					return (
						`<img id="${pathName}" src="${dataUrl}" style="display: none;"/>`
					)
				}
			),
			
			new FileType(
				"audio", "Audio", "audio/*",
				audioReaderInterface, 
				(dataUrl, bytes, mime, pathName) => {
					return `<audio id="${pathName}" style="display: none;" type="${mime}" src="${dataUrl}"></audio>`
				}
			),



			new FileType(
				"html", "HTML", "text/html",
				textEditorInterface, 
				(dataUrl, bytes, mime, pathName) => {
					return new TextDecoder().decode(bytes)
				}
			),
			
			new FileType(
				"css", "CSS", "text/css",
				textEditorInterface, 
				(dataUrl, bytes, mime, pathName) => {
					const text = new TextDecoder().decode(bytes)

					// be careful using </style> in css!
					return (
						`<style>${text}</style>`
					)
				}
			),
			
			new FileType(
				"js", "JS", "text/javascript",
				textEditorInterface, 
				(dataUrl, bytes, mime, pathName) => {
					return (
						`<script src="${dataUrl}"></script>`
					)
				}
			)
		)
		
		this.rootFolder.setElements(fileTreeElement, null, this)
		this.rootFolder.connectPath(null)
		this.exportList = new ExportList(exporterColumn, this)
		this.editor = new Editor(editorColumn, this)

		this.openElement = fileTreeColumn.columnElement.children[2].children[0]
		this.downloadElement = fileTreeColumn.columnElement.children[2].children[1]

		const fileTree = this
		applyButtonListeners(this.openElement, () => {

			// not available on firefox or safari, suck it! HAHA!
			makeFileDialog(false, (fileHandles) => {
				if(fileHandles.length <= 0) { return }
				
				const fileReader = new FileReader()
				fileReader.addEventListener("load", () => {
					fileTree.jsonToFileTree(JSON.parse(fileReader.result))
				})

				fileReader.readAsText(fileHandles[0])
			}, false)
		})

		applyButtonListeners(this.downloadElement, () => {
			const aElement = document.createElement("a")
			const url = URL.createObjectURL(
				new Blob(
					[JSON.stringify(this.fileTreeToJson())], 
					{ type: "application/json" }
				)
			)
			
			aElement.setAttribute("href", url)
			aElement.setAttribute("download", "export.json")
			aElement.click()
			URL.revokeObjectURL(url)
		})
	}

	// const result = {
	// 	titleName: string,
	//
	// 	exportItemsSize: int,
	// 
	// 	treeDict: {
	// 		filePath: {
	// 			fileIndex: int,
	// 			exportItemIndex: int | null,
	// 			editorTabIndex: int | null
	// 		},
	//
	// 		...
	// 	},
	//
	// 	files: [
	// 		{
	// 			mime: string,
	// 			data: [ uint8 ]
	// 		}
	// 	]
	// }
	fileTreeToJson() {
		const result = {
			titleName: this.exportList.titleName,
			
			exportItemsSize: 0,
			
			treeDict: {},
			files: []
		}

		let filesSize = 0
		for(
			const [treeDictKey, treeDictItem] of 
			Object.entries(this.treeDict)
		) {
			if(!treeDictItem.isFile) { continue }
			const newTreeDictItem = {
				fileIndex: filesSize,
				exportItemIndex: null,
				editorTabIndex: null
			}
			
			if(treeDictItem.exportItem != null) {
				newTreeDictItem.exportItemIndex = treeDictItem.exportItem.itemIndex
				result.exportItemsSize++
			}

			if(treeDictItem.editorTab != null) {
				treeDictItem.editorTab.saveFile()
			}

			result.treeDict[treeDictKey] = newTreeDictItem
			result.files.push({
				mime: treeDictItem.fileItem.getMime(),
				data: Array.from(treeDictItem.fileItem.data)
			})

			filesSize++
		}

		return result
	}

	jsonToFileTree(json) {
		if(json.titleName != null) {
			this.exportList.titleName = json.titleName
		} else {
			this.exportList.titleName = ""
		}
		
		this.exportList.titleNameElement.setAttribute(
			"value", 
			this.exportList.titleName
		)

		const filesLength = this.rootFolder.files.length
		for(let i = 0; i < filesLength; i++) {
			this.rootFolder.files[0].deleteSelf()
		}

		const foldersLength = this.rootFolder.folders.length
		for(let i = 0; i < foldersLength; i++) {
			this.rootFolder.folders[0].deleteSelf()
		}
		
		const exportPathOrder = new Array(json.exportItemsSize).fill(null)
		for(
			const [jsonTreeDictKey, jsonTreeDictItem] of 
			Object.entries(json.treeDict)
		) {
			const jsonFile = json.files[jsonTreeDictItem.fileIndex]
			const file = new File("")
			file.fileTree = this
			file.data = new Uint8Array(jsonFile.data)
			file.setMime(jsonFile.mime)
			this.addFileToPath(jsonTreeDictKey, file, false)

			const exportItemIndex = jsonTreeDictItem.exportItemIndex
			if(exportItemIndex != null) {
				exportPathOrder[exportItemIndex] = jsonTreeDictKey
			}
		}

		for(let i = 0; i < this.exportList.items.length; i++) {
			const rootElement = this.exportList.items[i].elements.rootElement
			if(rootElement.parentNode == null) { continue }
			rootElement.parentNode.removeChild(rootElement)
		}

		this.exportList.items = []
		for(const exportPath of exportPathOrder) {
			if(exportPath == null) { continue }
			this.exportList.addItem(exportPath)
		}

		const tabsLength = this.editor.tabs.length
		for(let i = 0; i < tabsLength; i++) {
			this.editor.closeTab(0)
		}
	}

	setSupportedFileTypes(...argsNotArr) {
		const args = [ ...argsNotArr ]
		this.supportedFileTypes = {}
		for(const arg of args) {
			this.supportedFileTypes[arg.name] = arg
			if(arg.mime.includes("*")) {
				const genericMime = arg.mime.split("/")[0]
				this.genericMimeToFileType[genericMime] = arg
				arg.isGeneric = true
			} else {
				this.specificMimeToFileType[arg.mime] = arg
			}
		}

		this.defaultFileType = this.supportedFileTypes["text"]
	}

	addFileToPath(path, file, addToExportList = true) {
		if(path.includes("\\/")) {

			// if you do this then you suck!!!!!
			return
		}
		
		const pathParts = path.split("/")
		if(pathParts[0] != this.rootFolder.name) {
			return
		}

		file.name = pathParts[pathParts.length - 1]
		
		let pathIndex = 1
		let pastPath = ""
		let currentPath = `${this.rootFolder.name}`
		for(; pathIndex < pathParts.length; pathIndex++) {
			const treeDictItem = this.treeDict[currentPath]
			if(treeDictItem == null) { break }
			if(treeDictItem.isFile) { return }
			pastPath = currentPath
			currentPath += `/${pathParts[pathIndex]}`
		}

		currentPath = pastPath
		pathIndex--
		let currentTreeDict = this.treeDict[currentPath]
		if(currentPath == path) { return }
		if(pathIndex >= pathParts.length - 1) {
			currentTreeDict.folderItem.addFile(file)
			return
		}

		for(; pathIndex < pathParts.length - 1; pathIndex++) {
			const newFolder = new Folder(pathParts[pathIndex])
			currentTreeDict.folderItem.addFolder(
				newFolder
			)

			currentPath += `/${pathParts[pathIndex]}`
			currentTreeDict = this.treeDict[currentPath]
		}

		currentTreeDict.folderItem.addFile(file, addToExportList)
	}
}

