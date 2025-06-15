const cloneElement = (cloneName, newParent) => {
	const originalElement = document.getElementById(`CLONE-${cloneName}`)
	if(originalElement == null) { return null }

	const clone = originalElement.cloneNode(true)
	if(newParent != null) {
		newParent.appendChild(clone)
	}
	
	clone.removeAttribute("id")
	return clone
}

const cssViewWidth = (width) => {
	return `${width}vw`
}

const columnMinWidth = 15
class EditorColumn {
	constructor(columnName, editorColumns) {
		this.columnName = columnName
		this.editorColumns = editorColumns
		this.columnIndex = -1
		this.posX = 0

		this.columnElement = cloneElement(columnName, editorColumns.columnsElement)
		this.columnElement.style.display = "none"
		
		this.dragBarElement = cloneElement("drag-bar", editorColumns.columnsElement)
		this.dragBarElement.style.display = "none"

		this.beingDragged = false
		this.startMouseX = 0
		this.startPosX = 0
		
		const column = this // "this" could be almost anything in js
		const stopDrag = (event) => { column.beingDragged = false }
		window.addEventListener("mouseup", stopDrag)
		window.addEventListener("visibilitychange", (event) => {
			if(document.visibilityState == "hidden") {
				stopDrag(event)
			}
		})
		
		this.dragBarElement.addEventListener("mousedown", (event) => { 
			column.beingDragged = true
			column.startMouseX = event.clientX
			column.startPosX = column.posX
		})

		const columnIndex = this.columnIndex
		window.addEventListener("mousemove", (event) => {
			if(!column.beingDragged) { return }

			const diffMouseX = (
				(event.clientX - column.startMouseX) / window.innerWidth
			) * 100

			// also the "| 0" is a trick to make js treat numbers like actual numbers
			// because it prefers strings over numbers when you ADD A NUMBER. no error, just a string.
			// why? because the js devs are braindead and should jump off of a bridge. p.s. this is kept
			// here for the context for the comment above but the below code no longer serves any purpose
			// const nextIndex = (column.columnIndex | 0) + 1
			
			column.editorColumns.setColumnPosX(
				column.columnIndex,
				column.startPosX + diffMouseX
			)
		})
	}
}

class EditorColumns {
	constructor(columnsName, ...argsNotArr) {
		const args = [ ...argsNotArr ]

		this.columnsElement = document.getElementById(columnsName)
		if(this.columnsElement == null) { return }
		
		this.columns = []
		
		// there may be a bit off the end, will probably be fixed later
		const columnWidth = Math.floor(100 / args.length)
		for(const argIndex in args) {
			const newColumn = new EditorColumn(args[argIndex], this)
			this.columns.push(newColumn)
		}

		this.setupColumns()
	}

	updateDragBar(columnIndex) {
		if(columnIndex >= this.columns.length - 1) { return false }
		
		const column = this.columns[columnIndex]
		if(column.dragBarElement == null) { return false }

		column.dragBarElement.style.left = cssViewWidth(
			column.posX + (column.width - 3)
		)

		column.dragBarElement.style.right = cssViewWidth(
			100 - (column.posX + (column.width - 1))
		)
		
		return true
	}

	computeColumnStyles(columnIndex) {

		// don't code in js >:(
		columnIndex = columnIndex | 0
		
		const column = this.columns[columnIndex]
		const columnElement = column.columnElement
		const dragBarElement = column.dragBarElement
		if(this.columns.length == 1) {
				dragBarElement.style.display = "none"
				columnElement.style.left = cssViewWidth(1)
				columnElement.style.right = cssViewWidth(100 - 1)
				return
		}

		const rightSide = columnIndex < this.columns.length - 1
			? 100 - this.columns[columnIndex + 1].posX
			: 100 - 99
		
		columnElement.style.left = cssViewWidth(column.posX)
		columnElement.style.right = cssViewWidth(rightSide)
		dragBarElement.style.display = "none"
		
		if(columnIndex > 0) {
			dragBarElement.style.display = "block"
			dragBarElement.style.left = cssViewWidth(column.posX + 1)
			dragBarElement.style.right = cssViewWidth(100 - (column.posX + 2))
			columnElement.style.left = cssViewWidth(column.posX + 3)
		}
	}

	setColumnPosX(columnIndex, newPosX, clampPos = true) {
		if(this.columns.length == 1) {
			this.columns[0].posX = 1
			return
		}

		// js is dumb
		columnIndex = columnIndex | 0
		
		if(clampPos) {
			newPosX = Math.max(1, Math.min(newPosX, 100 - 10 - 1))
		}
		
		if(
			clampPos &&
			this.columns.length > 1 &&
			columnIndex > 0
		) {
			newPosX = Math.max(
				this.columns[columnIndex - 1].posX + 10,
				newPosX
			)

			if(
				this.columns.length > 2 &&
				columnIndex < this.columns.length - 1
			) {

				newPosX = Math.min(
					newPosX,
					this.columns[columnIndex + 1].posX - 10
				)
			}
		}

		const column = this.columns[columnIndex]
		column.posX = newPosX
		column.columnElement.style.left = cssViewWidth(newPosX)
		this.computeColumnStyles(columnIndex)
		if(
			this.columns.length > 1 &&
			columnIndex > 0
		) {
			this.computeColumnStyles(columnIndex - 1)
		}
	}

	setupColumns() {
		const spacing = 10
		let currentPosX = 1
		for(const columnIndex in this.columns) {
			const column = this.columns[columnIndex]
			column.columnIndex = columnIndex

			column.columnElement.style.display = "flex"
			column.columnElement.style.flexDirection = "column"
			if(columnIndex > 0) {
				column.dragBarElement.style.display = "block"
			}
			
			this.setColumnPosX(columnIndex, currentPosX, false)
			currentPosX += spacing
		}
	}
}

