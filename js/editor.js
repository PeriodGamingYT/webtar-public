const textEditorInterface = {
	canChange: true,
	makeElement: () => {
		const textAreaElement = document.createElement("textarea")
		textAreaElement.addEventListener("keydown", (event) => {
			if(event.key != "Tab") {
				return
			}

			event.preventDefault()

			// not an attributes!
			const startIndex = textAreaElement.selectionStart
			const endIndex = textAreaElement.selectionEnd
			const value = textAreaElement.value
			textAreaElement.value = (
				value.substring(0, startIndex) +
				"\t" +
				value.substring(endIndex)
			)

			textAreaElement.selectionStart = textAreaElement.selectionEnd = startIndex + 1
		})

		return textAreaElement
	},

	toBytes: (element) => {
		return new TextEncoder().encode(element.value)
	},

	fromBytes: (element, bytes, mime) => {
		const result = new TextDecoder().decode(bytes)
		element.value = result
		return result
	}
}

const randomRange = (min, max) => {
	return Math.floor(min + (Math.random() * (max - min)))
}

const randomCharacter = () => {
	const chars = "1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM"
	return chars[randomRange(0, chars.length - 1)]
}

const fontReaderInterface = {
	canChange: false,
	makeElement: () => {
		return cloneElement("editor-font", null)
	},

	toBytes: (element) => {
		return null
	},

	fromBytes: (element, bytes, mime) => {
		document.fonts.clear()

		let fontName = "custom-font-name-"
		for(let i = 0; i < randomRange(5, 20); i++) {
			fontName += randomCharacter()
		}

		const fileReader = new FileReader()
		fileReader.addEventListener("load", () => {
			const fontFace = new FontFace(
				fontName,
				`url(${fileReader.result})`
			)

			document.fonts.add(fontFace)
			fontFace.load().then(() => {
				element.style.fontFamily = fontName
			})
		})

		const blob = new Blob([bytes], { type: mime })
		fileReader.readAsDataURL(blob)
	}
}

const imageReaderInterface = {
	canChange: false,
	makeElement: () => {
		return cloneElement("editor-image", null)
	},

	toBytes: (element) => {
		return null
	},

	fromBytes: (element, bytes, mime) => {
		const blob = new Blob([bytes], { type: mime })
		const fileReader = new FileReader()
		fileReader.addEventListener("load", () => {
			element.setAttribute("src", fileReader.result)
		})

		fileReader.readAsDataURL(blob)
	}
}

const audioReaderInterface = {
	canChange: false,
	makeElement: () => {
		return cloneElement("editor-audio")
	},

	toBytes: (element) => {
		return null
	},

	fromBytes: (element, bytes, mime) => {
		const audioElement = element.children[0]
		audioElement.setAttribute("type", mime)

		const blob = new Blob([bytes], { type: mime })
		const fileReader = new FileReader()
		fileReader.addEventListener("load", () => {
			audioElement.setAttribute("src", fileReader.result)
		})

		fileReader.readAsDataURL(blob)
	}
}

const applyEditorTabElementsListeners = (editorTabElements, editorTab) => {
	applyButtonListeners(editorTabElements.nameElement, onClickWrapper("activateTabListener", editorTab))
	applyButtonListeners(editorTabElements.closeElement, onClickWrapper("closeEditorTabListener", editorTab))
	applyButtonListeners(editorTabElements.leftElement, onClickWrapper("moveLeftListener", editorTab))
	applyButtonListeners(editorTabElements.rightElement, onClickWrapper("moveRightListener", editorTab))
}

const getEditorTabElements = (rootElement) => {
	return {
		rootElement: rootElement,
			nameElement: rootElement.children[0],
			closeElement: rootElement.children[1],
			leftElement: rootElement.children[2],
			rightElement: rootElement.children[3]
	}
}

const makeEditorTabElements = (parentElement, editorTab) => {
	const rootElement = cloneElement("editor-tab", parentElement)
	const editorTabElements = getEditorTabElements(rootElement)
	editorTabElements.nameElement.innerHTML = editorTab.path
	applyEditorTabElementsListeners(editorTabElements, editorTab)
	return editorTabElements
}

class EditorTab {
	constructor(path, fileTree) {
		this.path = path
		this.treeDict = fileTree.treeDict

		this.parentTabElement = null
		this.parentFileElement = null
		this.parentEditor = null

		this.editorTabElements = null
		this.editorFileElement = null
		this.tabIndex = -1
	}

	activateTabListener(editorTab) {
		editorTab.parentEditor.setActiveTab(editorTab.tabIndex)
	}

	closeEditorTabListener(editorTab) {
		if(editorTab.treeDict != null) {
			editorTab.saveFile()
		}

		editorTab.parentEditor.closeTab(editorTab.tabIndex)
	}

	moveLeftListener(editorTab) {
		editorTab.parentEditor.relativeSwap(editorTab.tabIndex, -1)
	}

	moveRightListener(editorTab) {
		editorTab.parentEditor.relativeSwap(editorTab.tabIndex, 1)
	}

	saveFile() {
		if(this.treeDict == null) { return }

		const supportedFileTypes = this.parentEditor.fileTree.supportedFileTypes
		const fileItem = this.treeDict[this.path].fileItem
		const editorInterface = supportedFileTypes[fileItem.fileTypeKey].editorInterface

		if(!editorInterface.canChange) { return }
		fileItem.data = editorInterface.toBytes(this.editorFileElement)
	}

	updatePath(newPath) {
		if(this.treeDict == null) { return }

		this.path = newPath
		this.editorTabElements.nameElement.innerHTML = newPath
	}

	setElements(
		parentTabElement,

		// NOTE: parentFileElement doesn't need any replacement
		// when swapping elements
		parentFileElement,
		parentEditor
	) {
		this.parentTabElement = parentTabElement
		this.parentFileElement = parentFileElement
		this.parentEditor = parentEditor

		this.editorTabElements = makeEditorTabElements(
			parentTabElement,
			this
		)

		const supportedFileTypes = this.parentEditor.fileTree.supportedFileTypes
		const fileItem = this.treeDict[this.path].fileItem
		const editorInterface = supportedFileTypes[fileItem.fileTypeKey].editorInterface

		this.editorFileElement = editorInterface.makeElement()
		editorInterface.fromBytes(
			this.editorFileElement,
			fileItem.data,
			fileItem.getMime()
		)

		this.editorFileElement.setAttribute("class", "editor-file")
		this.editorFileElement.style.marginTop = "8px"

		this.parentFileElement.appendChild(this.editorFileElement)
		parentEditor.tabs.push(this)
		this.tabIndex = parentEditor.tabs.length - 1
		this.parentEditor.setActiveTab(this.tabIndex)
	}

	setVisibility(isVisible) {
		this.editorFileElement.style.display = isVisible
			? "inherit"
			: "none"

		this.editorTabElements.nameElement.style.fontWeight = isVisible
			? "bold"
			: "inherit"
	}

	// only applies to tab
	applyListeners(rootElement) {
		this.editorTabElements = getEditorTabElements(rootElement)
		applyEditorTabElementsListeners(this.editorTabElements, this)
	}
}

class Editor {
	constructor(column, fileTree) {
		this.editorTabsElement = column.columnElement.children[1].children[0]
		this.editorFilesElement = column.columnElement.children[1].children[1]
		this.fileTree = fileTree

		this.tabs = []
		this.activeTabIndex = -1
	}

	addTab(editorTab) {
		editorTab.setElements(
			this.editorTabsElement,
			this.editorFilesElement,
			this
		)

		return editorTab
	}

	closeTab(tabIndex) {
		const editorTab = this.tabs[tabIndex]
		if(editorTab.treeDict != null) {
			editorTab.treeDict[editorTab.path].editorTab = null
		}

		const activeTabIndex = this.activeTabIndex
		const isActiveTab = editorTab.tabIndex == activeTabIndex
		editorTab.parentTabElement.removeChild(
			editorTab.editorTabElements.rootElement
		)

		if(editorTab.editorFileElement != null) {
			editorTab.parentFileElement.removeChild(
				editorTab.editorFileElement
			)
		}

		this.tabs.splice(editorTab.tabIndex, 1)
		if(this.tabs.length == 0) {
			this.activeTabIndex = -1
			return
		} else {
			this.activeTabIndex = Math.min(
				this.activeTabIndex,
				this.tabs.length - 1
			)
		}

		for(
			let i = tabIndex;
			i > -1 && i < this.tabs.length;
			i++
		) {
			this.tabs[i].tabIndex = i
		}

		if(isActiveTab) {
			this.activeTabIndex = -1
			this.setActiveTab(Math.min(
				this.tabs.length - 1,
				activeTabIndex
			))
		}
	}

	setActiveTab(tabIndex) {
		if(tabIndex == this.activeTabIndex) { return }

		if(this.activeTabIndex != -1) {
			this.tabs[this.activeTabIndex].setVisibility(false)
		}

		this.tabs[tabIndex].setVisibility(true)
		this.activeTabIndex = tabIndex
	}

	relativeSwap(origIndex, indexOffset) {
		const offsetIndex = origIndex + indexOffset
		if(
			indexOffset == 0 ||
			offsetIndex < 0 ||
			offsetIndex > this.tabs.length - 1
		) { return }

		const origElement = this.editorTabsElement.children[origIndex].cloneNode(true)
		const offsetElement = this.editorTabsElement.children[offsetIndex].cloneNode(true)
		this.editorTabsElement.replaceChild(
			origElement,
			this.editorTabsElement.children[offsetIndex]
		)

		this.editorTabsElement.replaceChild(
			offsetElement,
			this.editorTabsElement.children[origIndex]
		)

		this.tabs[origIndex].tabIndex = offsetIndex
		this.tabs[offsetIndex].tabIndex = origIndex

		this.tabs[origIndex].applyListeners(origElement)
		this.tabs[offsetIndex].applyListeners(offsetElement)

		if(this.activeTabIndex == offsetIndex) {
			this.activeTabIndex = origIndex
		} else {
			this.activeTabIndex = offsetIndex
		}

		const temp = this.tabs[origIndex]
		this.tabs[origIndex] = this.tabs[offsetIndex]
		this.tabs[offsetIndex] = temp
	}
}

