const copyAreaElement = document.getElementById("copy-area")

const copyText = (text) => {
	if(navigator.clipboard != null) {
		navigator.clipboard.writeText(text)
		return
	}

	copyAreaElement.setAttribute("value", text)
	copyAreaElement.style.display = "inherit"

	copyAreaElement.focus()
	copyAreaElement.select()
}

const hideCopyArea = () => {
	const selection = document.getSelection()
	selection.removeAllRanges()

	copyAreaElement.setAttribute("value", "")
	copyAreaElement.blur()
	copyAreaElement.style.display = "none"
}

document.addEventListener("load", () => {
	copyAreaElement.addEventListener("keydown", (event) => {
		if(event.key == "Escape") { hideCopyArea() }
	})

	copyAreaElement.addEventListener("focusout", hideCopyArea)
})
