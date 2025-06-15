window.addEventListener("load", () => {
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

