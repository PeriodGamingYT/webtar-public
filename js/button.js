
// js is and will always be stupid
const onClickWrapper = (funcName, object) => {
	return () => { object[funcName](object) }
}

const onClickExpandingWrapper = (funcName, object) => {
	return (userInput) => { object[funcName](userInput, object) }
}

const applyButtonListeners = (buttonElement, onClick) => {
	if(onClick == null) { return }
	buttonElement.addEventListener("mouseup", (event) => {
		if(event.button != 0) {
			return
		}

		onClick()
	})
}

const addButton = (parentElement, name, onClick) => {
	const buttonElement = document.createElement("button")
	buttonElement.innerHTML = name
	buttonElement.setAttribute("class", "button")
	applyButtonListeners(buttonElement, onClick)
	parentElement.appendChild(buttonElement)
	return buttonElement
}

const applyExpandingButtonListeners = (buttonContainerElement, onClick) => {
	if(onClick == null) { return }
	const buttonElement = buttonContainerElement.children[0]
	const textInputElement = buttonContainerElement.children[1]
	const confirmButtonElement = buttonContainerElement.children[2]

	// hacky trick, i know
	const name = confirmButtonElement.innerHTML

	let isPressed = false
	const sendInput = () => {
		if(textInputElement.value != "") {
			onClick(textInputElement.value)
		}

		isPressed = false
		buttonElement.innerHTML = name
		confirmButtonElement.style.display = "none"
		textInputElement.style.display = "none"
	}

	textInputElement.addEventListener("keyup", (event) => {
		if(event.key != "Enter") {
			return
		}

		sendInput()
	})

	confirmButtonElement.addEventListener("mouseup", (event) => {
		if(event.button != 0) {
			return
		}

		sendInput()
	})

	buttonElement.addEventListener("mouseup", (event) => {
		if(event.button != 0) {
			return
		}

		if(isPressed) {
			isPressed = false
			buttonElement.innerHTML = name
			confirmButtonElement.style.display = "none"
			textInputElement.style.display = "none"
			return
		}

		isPressed = true
		buttonElement.innerHTML = "X"
		confirmButtonElement.style.display = "inherit"
		textInputElement.style.display = "inherit"
		textInputElement.value = ""
		textInputElement.focus()
		event.preventDefault()
	})
}

const addExpandingButton = (parentElement, name, onClick) => {
	const buttonContainerElement = cloneElement("expanding-button", parentElement)
	const buttonElement = buttonContainerElement.children[0]
	const confirmButtonElement = buttonContainerElement.children[2]

	buttonElement.innerHTML = name
	confirmButtonElement.innerHTML = name
	applyExpandingButtonListeners(buttonContainerElement, onClick)
	return buttonContainerElement
}

const setupExpandingButtons = () => {

	// can't rely on elementsToReplace being consistent, dear god
	const length = document.getElementsByClassName("replace-expanding-button").length
	for(let i = 0; i < length; i++) {
		const element = document.getElementsByClassName("replace-expanding-button")[0]

		// have to do it manually, .replaceChild doesn't work, can't copy over children
		// and attributes from addExpandingButton
		const name = element.innerHTML
		element.setAttribute("class", "")
		element.style.display = "flex"
		element.style.flexDirection = "row"
		element.innerHTML = ""

		const buttonElement = document.createElement("button")
		buttonElement.setAttribute("class", "button")
		buttonElement.innerHTML = name
		element.appendChild(buttonElement)

		const textInputElement = document.createElement("input")
		textInputElement.setAttribute("type", "text")
		textInputElement.setAttribute("class", "text-input")
		textInputElement.style.display = "none"
		textInputElement.style.width = "5vw"
		textInputElement.setAttribute("autocomplete", "off")
		textInputElement.setAttribute("autocorrect", "off")
		textInputElement.setAttribute("autocapitalize", "off")
		textInputElement.setAttribute("spellcheck", "false")
		element.appendChild(textInputElement)

		const confirmButtonElement = document.createElement("button")
		confirmButtonElement.setAttribute("class", "button")
		confirmButtonElement.style.display = "none"
		confirmButtonElement.innerHTML = name
		element.appendChild(confirmButtonElement)
	}
}

