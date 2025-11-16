let copyAreaElement = null

const copyText = (text) => {
	if(navigator.clipboard != null) {
		navigator.clipboard.writeText(text)
		return
	}

	if(copyAreaElement == null) { return }

	copyAreaElement.setAttribute("value", text)
	copyAreaElement.style.display = "inherit"

	copyAreaElement.focus()
	copyAreaElement.select()
}

const hideCopyArea = () => {
	if(copyAreaElement == null) { return }

	const selection = document.getSelection()
	selection.removeAllRanges()

	copyAreaElement.setAttribute("value", "")
	copyAreaElement.blur()
	copyAreaElement.style.display = "none"
}

window.addEventListener("load", () => {
	copyAreaElement = document.getElementById("copy-area")

	copyAreaElement.addEventListener("keydown", (event) => {
		if(event.key == "Escape") { hideCopyArea() }
	})

	copyAreaElement.addEventListener("focusout", hideCopyArea)
})
