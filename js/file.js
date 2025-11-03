const applyFileElementsListeners = (elements, file) => {
	elements.typeInputElement.addEventListener("change", (event) => {
		file["changeTypeListener"](event, file)
	})

	// the pattern of releasing a button doing something is broken here,
	// because it makes it awkward to open files
	elements.nameElement.addEventListener("mousedown", (event) => {
		file.openTabListener(file)
	})

	applyExpandingButtonListeners(elements.renameElement, onClickExpandingWrapper("renameFileListener", file))
	applyButtonListeners(elements.copyPathElement, onClickWrapper("copyPathListener", file))
	applyButtonListeners(elements.deleteElement, onClickWrapper("deleteFileListener", file))
	applyButtonListeners(elements.upElement, onClickWrapper("moveUpListener", file))
	applyButtonListeners(elements.downElement, onClickWrapper("moveDownListener", file))
}

const getFileElements = (rootElement) => {
	return {
		rootElement: rootElement,
			typeInputElement: rootElement.children[0],
			nameElement: rootElement.children[1],
			renameElement: rootElement.children[2],
			copyPathElement: rootElement.children[3],

			deleteElement: rootElement.children[4],
			upElement: rootElement.children[5],
			downElement: rootElement.children[6]
	}
}

const genericMimesMatch = (mime1, mime2) => {
	return (
		mime1 == mime2 ||
		`${mime1}/*` == mime2
	)
}

const makeFileElements = (parentElement, file) => {
	const rootElement = cloneElement("file-item", parentElement)
	const elements = getFileElements(rootElement)
	const supportedFileTypes = file.fileTree.supportedFileTypes

	for(const [_, fileType] of Object.entries(supportedFileTypes)) {
		const optionElement = document.createElement("option")
		optionElement.setAttribute("value", fileType.name)
		optionElement.innerHTML = fileType.displayName
		if(fileType.isGeneric || file.genericMime != "") {
			optionElement.setAttribute("disabled", "")
		}

		elements.typeInputElement.appendChild(optionElement)
	}

	elements.typeInputElement.value = file.fileTypeKey
	if(file.genericMime != "") {
		elements.typeInputElement.style.fontStyle = "italic"
	}

	elements.nameElement.innerHTML = file.name
	applyFileElementsListeners(elements, file)
	return elements
}

class FileType {
	constructor(name, displayName, mime, editorInterface, onExport) {
		this.name = name
		this.displayName = displayName
		this.mime = mime

		this.editorInterface = editorInterface
		this.onExport = onExport

		this.isGeneric = false
	}
}

class File {
	constructor(name) {

		// this is needed in ExportList
		this.isFile = true

		this.name = name
		this.fileTypeKey = "text"

		this.parentFolder = null
		this.fileTree = null
		this.elements = null
		this.fileIndex = -1

		this.data = new Uint8Array(0);

		this.path = ""
		this.treeDict = null
		this.parentPath = ""

		// only needed for generic mime types that are imported
		this.genericMime = ""
		this.moreSpecificMime = ""
	}

	changeTypeListener(event, file) {
		file.fileTypeKey = event.target.value
	}

	openTabListener(file) {
		if(file.treeDict == null) { return }

		const treeDictItem = file.treeDict[file.path]
		if(treeDictItem.editorTab != null) {
			file.fileTree.editor.setActiveTab(
				treeDictItem.editorTab.tabIndex
			)

			return
		}

		treeDictItem.editorTab = file.fileTree.editor.addTab(
			new EditorTab(file.path, file.fileTree)
		)
	}

	renameFileListener(userInput, file) {
		if(!file.parentFolder.isNameValid(userInput)) { return }

		file.name = userInput
		if(file.treeDict != null) {
			file.updatePath(`${file.parentPath}/${file.name}`)
		}

		file.elements.nameElement.innerHTML = userInput
	}

	copyPathListener(file) {
		if(file.treeDict == null) { return }
		copyText(file.path)
	}

	deleteFileListener(file) {
		if(window.confirm(
			`Confirming this dialog will delete the ${file.name} file (This is irreversible)!`
		)) {
			file.deleteSelf()
		}
	}

	moveUpListener(file) {
		file.parentFolder.relativeSwap(false, file.fileIndex, -1)
	}

	moveDownListener(file) {
		file.parentFolder.relativeSwap(false, file.fileIndex, 1)
	}

	deletePath() {
		if(
			this.treeDict == null ||
			this.treeDict[this.path] == null
		) {
			this.treeDict = null
			this.fileTree = null
			this.path = null
			return
		}

		const exportItem = this.treeDict[this.path].exportItem
		if(exportItem != null) { exportItem.deleteSelf() }

		const editorTab = this.treeDict[this.path].editorTab
		if(editorTab != null) {
			editorTab.parentEditor.closeTab(
				editorTab.tabIndex
			)
		}

		this.treeDict[this.path] = null
		this.treeDict = null
		this.fileTree = null
		this.path = null
	}

	deleteSelf() {
		this.deletePath()

		if(this.elements.rootElement != null) {
			this.elements.rootElement.parentNode.removeChild(
				this.elements.rootElement
			)
		}

		this.parentFolder.files.splice(this.fileIndex, 1)
		for(let i = this.fileIndex; i < this.parentFolder.files.length; i++) {
			this.parentFolder.files[i].fileIndex = i
		}
	}

	getMime() {
		const fileType = this.fileTree.supportedFileTypes[this.fileTypeKey]
		if(fileType.isGeneric) {
			return this.moreSpecificMime
		}

		return fileType.mime
	}

	setMime(mime, name) {
		const genericMime = mime.split("/")[0]
		const genericMimeType = this.fileTree.genericMimeToFileType[genericMime]
		const specificMimeType = this.fileTree.specificMimeToFileType[mime]
		let fileType = genericMimeType != null
			? genericMimeType
			: specificMimeType

		if(fileType == null) {
			fileType = this.fileTree.defaultFileType
		}

		if(genericMimeType != null) {
			this.genericMime = genericMime
			this.moreSpecificMime = mime
		}

		this.fileTypeKey = fileType.name
	}

	loadFileBlob(fileBlob, afterLoaded) {
		this.name = fileBlob.name

		const fileReader = new FileReader()
		fileReader.addEventListener("load", () => {
			this.data = new Uint8Array(fileReader.result)
			this.setMime(fileBlob.type)

			// have to add edge case for ttf files
			// since they aren't recognized by Blob
			if(
				fileBlob.type == "" &&
				fileBlob.name.slice(-4) == ".ttf"
			) {
				this.genericMime = "font"
				this.moreSpecificMime = "font/ttf"
				const fileType = this.fileTree.genericMimeToFileType["font"]
				this.fileTypeKey = fileType.name
			}

			afterLoaded()
		}, false)

		fileReader.readAsArrayBuffer(fileBlob)
	}

	connectPath(parentPath) {
		this.path = `${parentPath}/${this.name}`
		this.treeDict = this.fileTree.treeDict
		this.treeDict[this.path] = new TreeDictFileItem(this)
		this.parentPath = parentPath
	}

	updatePath(newPath) {
		if(this.treeDict == null) { return }

		const oldPath = this.path
		this.path = newPath
		this.treeDict[this.path] = this.treeDict[oldPath]
		delete this.treeDict[oldPath]

		const exportItem = this.treeDict[this.path].exportItem
		if(exportItem != null) {
			exportItem.updatePath(this.path)
		}

		const editorTab = this.treeDict[this.path].editorTab
		if(editorTab != null) {
			editorTab.updatePath(this.path)
		}
	}

	setElements(parentElement, parentFolder, fileTree) {
		this.parentFolder = parentFolder
		this.fileTree = fileTree
		if(parentFolder != null) {
			this.fileIndex = parentFolder.files.length
		}

		this.elements = makeFileElements(parentElement, this)
		if(parentFolder != null) {
			parentFolder.files.push(this)
		}
	}

	applyListeners(rootElement) {
		this.elements = getFileElements(rootElement)
		applyFileElementsListeners(this.elements, this)
	}
}

