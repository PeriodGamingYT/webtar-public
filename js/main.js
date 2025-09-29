window.addEventListener("load", () => {
	if(navigator.clipboard == null) {
		const tabBar = document.getElementById("tab-bar")

		const seperatorElement = document.createElement("span")
		seperatorElement.style.paddingRight = "6px"
		seperatorElement.innerText = " | "
		tabBar.appendChild(seperatorElement)

		const warningElement = document.createElement("span")
		warningElement.style.color = "yellow"
		warningElement.innerText = "Can't find navigator.clipboard, so no copy/paste!"
		tabBar.appendChild(warningElement)
	}

	setupExpandingButtons()
	const editorColumns = new EditorColumns(
		"editor-columns",

		"exporter-column",
		"file-tree-column",
		"editor-column"
	)

	editorColumns.setColumnPosX(1, 15, false)
	editorColumns.setColumnPosX(2, 50, false)

	const fileTree = new FileTree(
		editorColumns.columns[1],
		editorColumns.columns[0],
		editorColumns.columns[2]
	)
})

console.log("hello!")
