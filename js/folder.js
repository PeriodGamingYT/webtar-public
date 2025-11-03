const isValidName = (name) => {
	return !name.includes("/")
}

const expandedToString = (isExpanded) => {
	return isExpanded ? "-" : "+"
}

const setFolderElementsVisibility = (elements) => {
	for(let i = 1; i < elements.rootElement.children.length; i++) {
		elements.rootElement.children[i].style.display = elements.isOpen
			? "inherit"
			: "none"
	}

	elements.expansionIndicatorElement.innerHTML = expandedToString(elements.isOpen)
}

const applyFolderElementsListeners = (elements, folder) => {
	// summaryElement
		const toggleVisibility = () => {
			elements.isOpen = !elements.isOpen
			setFolderElementsVisibility(elements)
		}

		elements.expansionIndicatorElement.addEventListener("mouseup", toggleVisibility)
		elements.nameElement.addEventListener("mouseup", toggleVisibility)

	// nameElement
		applyExpandingButtonListeners(elements.renameElement, onClickExpandingWrapper("renameFolderListener", folder))
		applyButtonListeners(elements.copyPathElement, onClickWrapper("copyPathListener", folder))
		applyButtonListeners(elements.deleteElement, onClickWrapper("deleteFolderListener", folder))
		applyButtonListeners(elements.upElement, onClickWrapper("moveUpListener", folder))
		applyButtonListeners(elements.downElement, onClickWrapper("moveDownListener", folder))

	// filesContainerElement
		applyExpandingButtonListeners(elements.addFileElement, onClickExpandingWrapper("addFileListener", folder))
		applyButtonListeners(elements.importFileElement, onClickWrapper("importFileListener", folder))
		applyExpandingButtonListeners(elements.moveFileElement, onClickExpandingWrapper("moveFileListener", folder))

	// foldersContainerElement
		applyExpandingButtonListeners(elements.addFolderElement, onClickExpandingWrapper("addFolderListener", folder))
		applyButtonListeners(elements.importFolderElement, onClickWrapper("importFolderListener", folder))
		applyExpandingButtonListeners(elements.moveFolderElement, onClickExpandingWrapper("moveFolderListener", folder))
}

const getFolderElements = (rootElement) => {
	const elements = {
		isOpen: false,
		rootElement: rootElement,
			summaryElement: rootElement.children[0],
				expansionIndicatorElement: rootElement.children[0].children[0],
				nameElement: rootElement.children[0].children[1],
				renameElement: rootElement.children[0].children[2],
				copyPathElement: rootElement.children[0].children[3],

				deleteElement: rootElement.children[0].children[4],
				upElement: rootElement.children[0].children[5],
				downElement: rootElement.children[0].children[6],

			filesContainerElement: rootElement.children[1],
				filesElement: rootElement.children[1].children[1],
				addFileElement: rootElement.children[1].children[2].children[0],
				importFileElement: rootElement.children[1].children[2].children[1],
				moveFileElement: rootElement.children[1].children[2].children[2],

			foldersContainerElement: rootElement.children[3],
				foldersElement: rootElement.children[3].children[1],
				addFolderElement: rootElement.children[3].children[2].children[0],
				importFolderElement: rootElement.children[3].children[2].children[1],
				moveFolderElement: rootElement.children[3].children[2].children[2]
	}

	// hacky trick, i know
	elements.isOpen = (
		elements.expansionIndicatorElement.innerHTML == expandedToString(true)
	)

	return elements
}

const makeFolderElements = (parentFolder, folder) => {
	const rootElement = cloneElement("folder-item", null)
	const elements = getFolderElements(rootElement)
	elements.isOpen = parentFolder == null
	elements.rootElement.setAttribute("open", elements.isOpen)
	if(parentFolder == null) {
		elements.rootElement.style.marginLeft = "3px"
	} else {
		elements.rootElement.style.marginLeft = "5%"
	}

	elements.nameElement.innerHTML = folder.name

	// can't set it in html due to div replacement mechanism.
	// see the setupExpandingButtons function
	elements.renameElement.style.display = "none"
	setFolderElementsVisibility(elements)
	if(elements.isOpen) {
		applyFolderElementsListeners(elements, folder)
		return elements
	}

	elements.renameElement.style.display = "inherit"
	elements.deleteElement.style.display = "inherit"
	elements.upElement.style.display = "inherit"
	elements.downElement.style.display = "inherit"
	applyFolderElementsListeners(elements, folder)
	return elements
}

const makeFileDialog = (allowFolders, onReceived, allowMultiple = true) => {
	const inputElement = document.createElement("input")
	inputElement.setAttribute("type", "file")

	if(allowMultiple) {
		inputElement.setAttribute("multiple", "")
	}

	if(allowFolders) {
		inputElement.setAttribute("directory", "")
		inputElement.setAttribute("webkitdirectory", "")
	}

	inputElement.addEventListener("cancel", () => {
		onReceived([])
	})

	inputElement.addEventListener("change", () => {
		onReceived([...inputElement.files])
	})

	inputElement.click()
}

class Folder {
	constructor(name) {

		// this is needed in ExportList
		this.isFile = false

		this.name = name
		this.files = []
		this.folders = []

		this.parentFolder = null
		this.fileTree = null
		this.elements = null
		this.folderIndex = -1

		this.path = ""
		this.treeDict = null
		this.parentPath = ""
	}

	// js is and will always be stupid (can't infer what this means in a event listener)
	addFileListener(userInput, folder) {
		if(!folder.isNameValid(userInput)) { return }
		folder.addFile(new File(userInput))
	}

	importFileListener(folder) {
		if(folder.treeDict == null) { return }
		makeFileDialog(false, (fileBlobs) => {
			for(const fileBlob of fileBlobs) {
				const newFile = new File("")
				newFile.fileTree = folder.fileTree
				newFile.loadFileBlob(fileBlob, () => {
					folder.addFile(newFile)
				})
			}
		})
	}

	moveFileListener(userInput, folder) {
		const treeDictItem = folder.treeDict[userInput]
		if(treeDictItem == null || !treeDictItem.isFile) { return }
		const fileItem = treeDictItem.fileItem
		const rootElementClone = fileItem.elements.rootElement.cloneNode(true)
		fileItem.elements.rootElement.parentNode.removeChild(
			fileItem.elements.rootElement
		)

		fileItem.updatePath(
			`${folder.path}/${treeDictItem.fileItem.name}`
		)

		fileItem.applyListeners(rootElementClone)
		folder.elements.filesElement.appendChild(
			rootElementClone
		)

		folder.files.push(fileItem)
	}

	addFolderListener(userInput, folder) {
		if(!folder.isNameValid(userInput)) { return }
		const newFolder = new Folder(userInput)
		folder.addFolder(newFolder)
	}

	importFolderListener(folder) {
		makeFileDialog(true, (fileBlobs) => {
			for(const fileBlob of fileBlobs) {
				const path = fileBlob.webkitRelativePath
				const newFile = new File("")
				newFile.fileTree = folder.fileTree
				newFile.loadFileBlob(fileBlob, () => {
					folder.fileTree.addFileToPath(
						`${folder.path}/${path}`,
						newFile
					)
				})
			}
		})
	}

	moveFolderListener(userInput, folder) {
		const treeDictItem = folder.treeDict[userInput]
		if(treeDictItem == null || treeDictItem.isFile) { return }
		const folderItem = treeDictItem.folderItem
		const rootElementClone = folderItem.elements.rootElement.cloneNode(true)
		folderItem.elements.rootElement.parentNode.removeChild(
			folderItem.elements.rootElement
		)

		folderItem.updatePath(
			`${folder.path}/${treeDictItem.folderItem.name}`
		)

		folderItem.applyListeners(rootElementClone)
		folder.elements.foldersElement.appendChild(
			rootElementClone
		)

		folder.folders.push(folderItem)
	}

	renameFolderListener(userInput, folder) {
		if(!folder.isNameValid(userInput)) { return }
		folder.name = userInput
		if(folder.treeDict != null) {
			folder.updatePath(
				folder.parentPath == null
					? folder.name
					: `${folder.parentPath}/${folder.name}`
			)
		}

		folder.elements.nameElement.innerHTML = userInput
	}

	copyPathListener(folder) {
		if(folder.treeDict == null) { return }
		copyText(folder.path)
	}

	deleteFolderListener(folder) {
		if(window.confirm(
			`Confirming this dialog will delete the ${folder.name} folder (This is irreversible)!`
		)) {
			folder.deleteSelf()
		}
	}

	moveUpListener(folder) {
		folder.parentFolder.relativeSwap(true, folder.folderIndex, -1)
	}

	moveDownListener(folder) {
		folder.parentFolder.relativeSwap(true, folder.folderIndex, 1)
	}

	isNameValid(name) {
		if(name.includes("/")) { return false }
		for(const file of this.files) {
			if(file.name == name) { return false }
		}

		for(const folder of this.folders) {
			if(folder.name == name) { return false }
		}

		return true
	}

	deleteSelf() {
		this.deletePath()

		if(this.elements.rootElement != null) {
			this.elements.rootElement.parentNode.removeChild(
				this.elements.rootElement
			)
		}

		this.parentFolder.folders.splice(this.folderIndex, 1)
		for(let i = this.folderIndex; i < this.parentFolder.folders.length; i++) {
			this.parentFolder.folders[i].folderIndex = i
		}
	}

	addFile(file, addToExportList = true) {
		file.setElements(
			this.elements.filesElement,
			this,
			this.fileTree
		)

		if(this.treeDict != null) {
			file.connectPath(this.path)
		}

		if(this.fileTree != null && addToExportList) {
			this.fileTree.exportList.addItem(file.path)
		}
	}

	addFolder(folder) {
		folder.setElements(
			this.elements.foldersElement,
			this,
			this.fileTree
		)

		if(this.treeDict != null) {
			folder.connectPath(this.path)
		}
	}

	connectPath(parentPath) {
		this.path = this.name
		if(parentPath != null) {
			this.path = `${parentPath}/${this.name}`
		}

		this.treeDict = this.fileTree.treeDict
		this.parentPath = parentPath
		this.treeDict[this.path] = new TreeDictFolderItem(this)
		for(const file in this.files) {
			file.fileTree = this.fileTree
			file.connectPath(this.path)
		}

		for(const folder in this.folders) {
			folder.fileTree = this.fileTree
			folder.connectPath(this.path)
		}
	}

	deletePath() {
		if(
			this.treeDict == null ||
			this.treeDict[this.path] == null
		) { return }

		for(const file of this.files) {
			file.deletePath()
		}

		for(const folder of this.folders) {
			folder.deletePath()
		}

		this.treeDict[this.path] = null
		this.treeDict = null
		this.fileTree = null
		this.path = ""
	}

	updatePath(newPath) {
		if(this.treeDict == null) { return }

		this.path = newPath
		for(const file of this.files) {
			file.updatePath(`${this.path}/${file.name}`)
		}

		for(const folder of this.folders) {
			folder.updatePath(`${this.name}/${folder.name}`)
		}
	}

	setElements(parentElement, parentFolder, fileTree) {
		this.parentFolder = parentFolder
		this.fileTree = fileTree
		if(parentFolder != null) {
			this.folderIndex = parentFolder.folders.length
		}

		this.elements = makeFolderElements(parentFolder, this)
		parentElement.appendChild(this.elements.rootElement)
		if(parentFolder != null) {
			parentFolder.folders.push(this)
		}
	}

	applyListeners(rootElement) {
		this.elements = getFolderElements(rootElement)
		applyFolderElementsListeners(this.elements, this)
		for(const folderIndex in this.folders) {
			const folder = this.folders[folderIndex]
			folder.applyListeners(
				this.elements.foldersElement.children[folderIndex]
			)
		}
	}

	relativeSwap(useFolders, origIndex, indexOffset) {
		const array = useFolders ? this.folders : this.files
		const parentElement = useFolders
			? this.elements.foldersElement
			: this.elements.filesElement

		const offsetIndex = origIndex + indexOffset
		if(
			indexOffset == 0 ||
			offsetIndex < 0 ||
			offsetIndex > array.length - 1
		) { return }

		const origElement = parentElement.children[origIndex].cloneNode(true)
		const offsetElement = parentElement.children[offsetIndex].cloneNode(true)
		parentElement.replaceChild(
			origElement,
			parentElement.children[offsetIndex]
		)

		parentElement.replaceChild(
			offsetElement,
			parentElement.children[origIndex]
		)

		array[origIndex].applyListeners(origElement)
		array[offsetIndex].applyListeners(offsetElement)
		if(useFolders) {
			array[origIndex].folderIndex = offsetIndex
			array[offsetIndex].folderIndex = origIndex
		} else {
			array[origIndex].fileIndex = offsetIndex
			array[offsetIndex].fileIndex = origIndex
		}

		const temp = array[origIndex]
		array[origIndex] = array[offsetIndex]
		array[offsetIndex] = temp
	}
}

